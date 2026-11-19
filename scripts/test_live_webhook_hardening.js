'use strict';
// Regression gates for the version-controlled live webhook candidate.
// These are structural assertions; live delivery and browser tests remain separate gates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const webhook = fs.readFileSync(path.join(__dirname, '..', 'launch-backend-staging', 'stripe-live-webhook', 'index.ts'), 'utf8');
test('reject unsigned webhook calls', () => {
  assert.match(webhook, /stripe\.webhooks\.constructEventAsync\(rawBody, signature, webhookSecret\)/);
  assert.match(webhook, /missing_signature/);
  assert.match(webhook, /invalid_signature/);
});
const leaseSource = fs.readFileSync(path.join(__dirname, '..', 'launch-backend-staging', 'stripe-live-webhook', 'receipt-lease.mjs'), 'utf8');
test('never acknowledge an unfinished duplicate as processed', () => {
  assert.match(leaseSource, /\["processed", "ignored"\]\.includes\(existing\.status\)/);
  assert.match(webhook, /claim\.kind === "terminal"/);
  assert.match(webhook, /claim\.kind === "retry"/);
  assert.match(webhook, /event_still_processing/);
});
test('only grant paid entitlement after payment and handle async completion', () => {
  assert.match(webhook, /case "checkout\.session\.completed":/);
  assert.match(webhook, /case "checkout\.session\.async_payment_succeeded":/);
  assert.match(webhook, /session\.payment_status !== "paid"/);
  assert.ok(webhook.indexOf('session.payment_status !== "paid"') < webhook.indexOf('syncSubscription(subscriptionId, session.client_reference_id)'), 'payment gate precedes access update');
});
test('preserves separation from sandbox and signed entitlement sync', () => {
  assert.match(webhook, /if \(!event\.livemode\)/);
  assert.match(webhook, /NBJB_SANDBOX_TEST_USER_ID/);
  assert.match(webhook, /from\("membership_entitlements"\)/);
  assert.match(webhook, /provider_subscription_ref: subscription\.id/);
});


const { pathToFileURL } = require('node:url');
const moduleUrl = pathToFileURL(path.join(__dirname, '..', 'launch-backend-staging', 'stripe-live-webhook', 'receipt-lease.mjs')).href;
const NOW = Date.parse('2026-11-18T14:00:00Z');
const EVENT = { id:'evt_fake', type:'invoice.paid', created:NOW/1000, livemode:true, data:{object:{id:'in_fake'}} };
const row = (status, age) => ({event_id:EVENT.id, status, livemode:true, received_at:new Date(NOW-age).toISOString()});
// Model atomic conditional updates and unique insertion; the real source is imported.
function store(initial, opts={}) {
  let current=initial && {...initial}, writes=0;
  return {
    get row(){return current;}, get writes(){return writes;},
    select(){return query('read');},
    update(patch){return query('update',patch);},
    async insert(value){if(opts.insertCollision || current) return {error:{code:'23505'}};current={...value};writes++;return {error:null};}
  };
  function query(kind,patch){
    const filters=[];
    return {eq(k,v){filters.push([k,v]);return this;},select(){return this;},async maybeSingle(){
      if(kind==='read'){
        const snapshot=current && {...current};
        if(opts.afterRead) opts.afterRead();
        return {data:snapshot,error:opts.readError?{message:'db'}:null};
      }
      if(!current||!filters.every(([k,v])=>current[k]===v))return {data:null,error:null};
      current={...current,...patch};writes++;return {data:{event_id:current.event_id},error:null};
    }};
  }
}
test('receipt insert uniqueness collision and fresh processing both require retry', async()=>{
  const {claimReceipt}=await import(moduleUrl);
  for(const db of [store(null,{insertCollision:true}),store(row('processing',1000))]){
    assert.equal((await claimReceipt(db,EVENT,NOW)).kind,'retry');
    assert.equal(db.writes,0);
  }
});
test('new receipt is claimed; terminal receipt is acknowledged without mutation',async()=>{
  const {claimReceipt}=await import(moduleUrl);
  const db=store(null);
  const first=await claimReceipt(db,EVENT,NOW);
  assert.equal(first.kind,'claimed');
  assert.equal(db.row.received_at,first.lease);
  const terminal=store(row('processed',3600000));
  assert.equal((await claimReceipt(terminal,EVENT,NOW)).kind,'terminal');
  assert.equal(terminal.writes,0);
});
test('stale and failed receipt attempts are reclaimed exactly once by compare and swap',async()=>{
  const {claimReceipt,RECEIPT_LEASE_MS}=await import(moduleUrl);
  for(const status of ['processing','failed']){
    const db=store(row(status,RECEIPT_LEASE_MS+1000));
    const claims=await Promise.all([claimReceipt(db,EVENT,NOW),claimReceipt(db,EVENT,NOW+1)]);
    assert.deepEqual(claims.map(x=>x.kind).sort(),['claimed','retry']);
    assert.equal(db.writes,1);
  }
});
test('failed read, invalid receipt time and non-live event fail closed',async()=>{
  const {claimReceipt}=await import(moduleUrl);
  assert.equal((await claimReceipt(store(null,{readError:true}),EVENT,NOW)).kind,'error');
  assert.equal((await claimReceipt(store({...row('processing',0),received_at:'invalid'}),EVENT,NOW)).kind,'error');
  assert.equal((await claimReceipt(store(null),{...EVENT,livemode:false},NOW)).kind,'error');
});
test('terminal writes are fenced by the current receipt lease',()=>{
  assert.match(webhook,/\.eq\("status", "processing"\)\s*\.eq\("received_at", receiptLease\)\s*\.select\("event_id"\)/);
  assert.match(webhook,/if \(!finished\) return json\(\{ error: "receipt_lease_lost" \}, 503\)/);
  assert.equal((webhook.match(/\.eq\("received_at", receiptLease\)/g)||[]).length,2);
});

const paymentModule=pathToFileURL(path.join(__dirname,'../launch-backend-staging/stripe-live-webhook/payment-boundary.mjs')).href;
const checkoutModule=pathToFileURL(path.join(__dirname,'../launch-backend-staging/create-live-checkout-session/checkout-policy.mjs')).href;
const date=offset=>new Date(NOW+offset*86400000).toISOString();
const bounds={validFrom:date(-1),validUntil:date(29)};
const old={provider:'stripe',provider_subscription_ref:'sub_mock',provider_customer_ref:'cus_mock',tier:'paid_member',status:'active',valid_from:date(-31),valid_until:date(2)};
const mockSub=(status,invoiceStatus,overrides={})=>({id:'sub_mock',status,items:{data:[{id:'si_mock'}]},latest_invoice:{livemode:true,status:invoiceStatus,lines:{data:[{parent:{subscription_item_details:{subscription_item:'si_mock'}},period:{end:Date.parse(bounds.validUntil)/1000}}]}},...overrides});
test('paid invoice covering current subscription period grants access; failed renewal cannot advance it',async()=>{
 const {paymentBoundary}=await import(paymentModule);
 assert.equal(paymentBoundary(mockSub('active','paid'),old,bounds,NOW).validUntil,bounds.validUntil);
 for(const status of ['active','past_due']){
   const result=paymentBoundary(mockSub(status,'open'),old,bounds,NOW);
   assert.equal(result.validUntil,old.valid_until);
   assert.equal(result.status,'past_due');
 }
 const result=paymentBoundary(mockSub('past_due','open'),{...old,valid_until:date(-1)},bounds,NOW);
 assert.equal(result.tier,'free_member');
 assert.equal(paymentBoundary(mockSub('active','open'),null,bounds,NOW).tier,'free_member');
});
test('old invoice, test invoice, unmatched invoice item and canceled plan cannot advance entitlement',async()=>{
 const {paymentBoundary}=await import(paymentModule);
 for(const s of [mockSub('active','paid',{latest_invoice:{livemode:false,status:'paid',lines:{data:[]}}}),
   mockSub('active','paid',{latest_invoice:{livemode:true,status:'paid',lines:{data:[{subscription_item:'si_other',period:{end:Date.parse(bounds.validUntil)/1000}}]}}}),
   mockSub('active','paid',{latest_invoice:{livemode:true,status:'paid',lines:{data:[{subscription_item:'si_mock',period:{end:Date.parse(old.valid_until)/1000}}]}}})]){
   assert.equal(paymentBoundary(s,old,bounds,NOW).validUntil,old.valid_until);
 }
 assert.equal(paymentBoundary(mockSub('canceled','paid'),old,bounds,NOW).tier,'free_member');
});
test('older canceled subscription cannot overwrite a replacement subscription',async()=>{
 const {subscriptionConflict}=await import(paymentModule);
 assert.equal(subscriptionConflict(mockSub('canceled','paid',{id:'sub_old'}),old,'cus_mock'),true);
 assert.equal(subscriptionConflict(mockSub('active','paid'),old,'cus_different'),true);
 assert.equal(subscriptionConflict(mockSub('active','paid'),old,'cus_mock'),false);
});
test('refund reconciliation distinguishes pending partial unrelated full and canceled-but-paid cases',async()=>{
 const {refundReview}=await import(paymentModule);
 const item={scope:'subscription',status:'succeeded',refundedAmount:1499,chargeAmount:1499,mappingVerified:true,subscriptionStatus:'active',scheduledCancellation:false,entitlementPaid:true};
 assert.equal(refundReview(item),'full_refund_renewal_still_active');
 assert.equal(refundReview({...item,scheduledCancellation:true}),'full_refund_scheduled_exit_review');
 assert.equal(refundReview({...item,subscriptionStatus:'canceled'}),'entitlement_mismatch');
 assert.equal(refundReview({...item,subscriptionStatus:'canceled',entitlementPaid:false}),'resolved');
 assert.equal(refundReview({...item,refundedAmount:500}),'partial_refund_review');
 assert.equal(refundReview({...item,status:'pending'}),'pending_or_failed');
 assert.equal(refundReview({...item,scope:'product'}),'manual_mapping_review');
});
test('checkout simulations reject prototype offers, wrong prices, duplicate sessions and incomplete pages',async()=>{
 const {lookupOffer,validPrice,checkoutConflict,sessionIdempotencyKey}=await import(checkoutModule);
 assert.equal(lookupOffer('__proto__'),null);
 assert.equal(lookupOffer('constructor'),null);
 const monthly=lookupOffer('flamewalker_plus_monthly');
 const valid={lookup_key:monthly.lookupKey,currency:'usd',type:'recurring',unit_amount:1499,recurring:{interval:'month',interval_count:1},livemode:true};
 assert.equal(validPrice(valid,monthly),true);
 assert.equal(validPrice({...valid,recurring:{interval:'month',interval_count:2}},monthly),false);
 assert.equal(validPrice({...valid,livemode:false},monthly),false);
 assert.equal(validPrice({...valid,unit_amount:1},monthly),false);
 const empty={data:[],has_more:false};
 assert.equal(checkoutConflict(empty,empty),null);
 for(const status of ['active','trialing','past_due','unpaid','incomplete','paused'])assert.equal(checkoutConflict({data:[{status}]},empty),'already_subscribed');
 assert.equal(checkoutConflict(empty,{data:[{mode:'subscription',status:'open'}]}),'checkout_already_open');
 assert.equal(checkoutConflict({data:[],has_more:true},empty),'subscription_check_incomplete');
 assert.equal(sessionIdempotencyKey('cus_mock',0),sessionIdempotencyKey('cus_mock',100));
 assert.notEqual(sessionIdempotencyKey('cus_mock',0),sessionIdempotencyKey('cus_mock',1800000));
});
test('staged billing handlers use the tested policies',()=>{
 const checkout=fs.readFileSync(path.join(__dirname,'../launch-backend-staging/create-live-checkout-session/index.ts'),'utf8');
 assert.match(checkout,/lookupOffer\(offerSlug\)/);
 assert.match(checkout,/validPrice\(price, offer\)/);
 assert.match(checkout,/reservedCheckout\(ctx\.supabaseAdmin, stripe,/);
 assert.doesNotMatch(checkout,/sessionIdempotencyKey\(customerId\)/);
 assert.match(webhook,/expand: \["latest_invoice"\]/);
 assert.match(webhook,/paymentBoundary\(subscription, prior, bounds\)/);
 assert.match(webhook,/subscriptionConflict\(subscription, prior, customerId\)/);
});
