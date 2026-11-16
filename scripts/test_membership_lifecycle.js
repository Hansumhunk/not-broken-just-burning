'use strict';
/**
 * NBJB paid/free account boundary regression tests.
 * This is NOT a real checkout or a real Supabase Auth session.
 * Exercise the exact shipped client entitlement code with isolated mock rows;
 * structurally verify the version-controlled server guards before a release.
 * Read-only, offline, no secrets, real customers, payments, or network.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const source=(file)=>fs.readFileSync(path.join(ROOT,file),'utf8');
const msDay=86400000;
const iso=(days)=>new Date(Date.now()+days*msDay).toISOString();

async function evaluateMembership(row,{readError=false,signedOut=false}={}){
  const customerQuery={
    select(){return this;},
    eq(){return this;},
    single(){return Promise.resolve({data:row,error:readError?new Error('Database unavailable'):null});},
    then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}
  };
  const client={from(){return Object.create(customerQuery);}};
  const win={
    NBJBAuth:{client,user:signedOut?null:{id:'synthetic-test-user'}},
    dispatchEvent(){}
  };
  const ctx={
    window:win,
    document:{querySelectorAll(){return [];}},
    console:{error(){}},
    CustomEvent:class CustomEvent{constructor(name,opts){this.type=name;this.detail=opts?.detail;}}
  };
  vm.runInNewContext(source('js/member-entitlements.js'),ctx,{
    filename:'js/member-entitlements.js',timeout:1000
  });
  assert.ok(win.NBJBEntitlements?.ready);
  await win.NBJBEntitlements.ready;
  return win.NBJBEntitlements.load();
}
function activePaid(overrides={}){
 return {
  tier:'paid_member',status:'active',valid_from:iso(-2),valid_until:iso(10),
  cancel_at_period_end:false,provider:'stripe',
  provider_customer_ref:'cus_synthetic_not_a_real_customer',
  ...overrides
 };
}
test('Current live-style paid entitlement loads as paid only during its valid dates',async()=>{
 const state=await evaluateMembership(activePaid());
 assert.equal(state.tier,'paid');
 assert.equal(state.membershipStatus,'active');
 assert.equal(state.source,'server');
 assert.equal(state.hasStripeBilling,true);
 assert.equal(Object.hasOwn(state,'provider_customer_ref'),false);
});
test('Scheduled cancellation does not immediately revoke a paid period',async()=>{
 const state=await evaluateMembership(activePaid({cancel_at_period_end:true}));
 assert.equal(state.tier,'paid');
 assert.equal(state.cancelAtPeriodEnd,true);
 assert.equal(state.hasStripeBilling,true);
});
test('Paid period ending yesterday removes paid access despite active stored status',async()=>{
 const state=await evaluateMembership(activePaid({valid_until:iso(-1),cancel_at_period_end:true}));
 assert.equal(state.tier,'free');
 assert.equal(state.cancelAtPeriodEnd,true);
});
test('A future subscription start does not grant early premium access',async()=>{
 const state=await evaluateMembership(activePaid({valid_from:iso(2)}));
 assert.equal(state.tier,'free');
});
test('A canceled Stripe entitlement cannot retain paid access through a stale valid_until',async()=>{
 const state=await evaluateMembership(activePaid({status:'canceled',valid_until:iso(20)}));
 assert.equal(state.tier,'free');
});
test('Malformed or missing entitlement dates fail closed for paid membership',async()=>{
 const a=await evaluateMembership(activePaid({valid_from:'not-a-date'}));
 const b=await evaluateMembership(activePaid({valid_until:'not-a-date'}));
 const c=await evaluateMembership(null);
 assert.deepEqual([a.tier,b.tier,c.tier],['free','free','free']);
});
test('Errors reading the database do not promote the member',async()=>{
 const state=await evaluateMembership(activePaid(),{readError:true});
 assert.equal(state.tier,'free');
 assert.equal(state.source,'server_error');
});
test('Signed-out client remains guest and cannot inherit a paid entitlement',async()=>{
 const state=await evaluateMembership(activePaid(),{signedOut:true});
 assert.equal(state.tier,'guest');
});
test('Shipped email signup distinguishes immediate session from verification-required signup',()=>{
 const auth=source('js/member-auth.js');
 const client=source('js/nbjb-auth.js');
 assert.match(client,/emailRedirectTo:\s*location\.origin\s*\+\s*'\/member-auth\.html\?next=member-onboarding\.html'/);
 assert.match(auth,/if\s*\(data\.session\)/);
 assert.match(auth,/nextDestination\('member-onboarding\.html'\)/);
 assert.match(auth,/Check your email to verify it/);
 assert.match(auth,/auth\.signIn\(/);
});
test('Live checkout excludes designated sandbox identity and prevents duplicate paid purchase',()=>{
 const checkout=source('launch-backend-staging/create-live-checkout-session/index.ts');
 assert.match(checkout,/NBJB_SANDBOX_TEST_USER_ID/);
 assert.match(checkout,/sandbox_test_account_not_eligible/);
 assert.match(checkout,/already_subscribed/);
 assert.match(checkout,/stripe\.subscriptions\.list\(/);
 assert.match(checkout,/PUBLIC_LIVE_CHECKOUT_ENABLED/);
});
test('Version-controlled live webhook rejects test Stripe events and requires paid session',()=>{
 const webhook=source('launch-backend-staging/stripe-live-webhook/index.ts');
 assert.match(webhook,/if\s*\(!event\.livemode\)/);
 assert.match(webhook,/test_event_not_allowed/);
 assert.match(webhook,/NBJB_SANDBOX_TEST_USER_ID/);
 assert.match(webhook,/session\.payment_status\s*!==\s*"paid"/);
});
test('Version-controlled live webhook recognizes Stripe future cancel_at independently of period-end boolean',()=>{
 const webhook=source('launch-backend-staging/stripe-live-webhook/index.ts');
 assert.match(webhook,/subscription\.cancel_at_period_end\s*\|\|/);
 assert.match(webhook,/typeof subscription\.cancel_at === "number"/);
 assert.match(webhook,/subscription\.cancel_at > Math\.floor\(Date\.now\(\) \/ 1000\)/);
 assert.match(webhook,/case "customer\.subscription\.deleted":/);
 assert.match(webhook,/membershipState\(subscription\.status\)/);
});
test('Public member pages must keep session and paid premium lessons behind server access',()=>{
 const bootstrap=source('js/member-bootstrap.js');
 const lessonClient=source('js/member-premium-lesson.js');
 assert.match(bootstrap,/auth\.refresh\(\)/);
 assert.match(bootstrap,/body\.dataset\.memberAccess\s*=\s*"granted"/);
 assert.match(lessonClient,/read-flamewalker-lesson/);
 assert.match(bootstrap,/redirectToLogin\(\)/);
});
