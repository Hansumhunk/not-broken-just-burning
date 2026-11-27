// Actual staged handlers, real pinned Stripe SDK signature validation, in-memory
// Supabase/PostgREST and Stripe retrieval adapters. No network or real identities.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes,createRequire} from 'node:module';
import {claimReceipt} from '../launch-backend-staging/stripe-live-webhook/receipt-lease.mjs';
import {paymentBoundary,subscriptionConflict} from '../launch-backend-staging/stripe-live-webhook/payment-boundary.mjs';
import {retryMembershipRevision,MAX_REVISION_ATTEMPTS} from '../launch-backend-staging/stripe-live-webhook/revision-retry.mjs';
import {billingEnvironment} from '../launch-backend-staging/membership-atomic/billing-environment.mjs';
const StripeSDK=createRequire(import.meta.url)('stripe');
const sdk=new StripeSDK('sk_test_fixture_offline');
const secret='whsec_nbjb_synthetic_only';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const customer='cus_fixture',sid='sub_fixture',offer='flamewalker_plus_monthly';
const now=Date.now(),end=Math.floor((now+86400000)/1000)*1000,newEnd=end+30*86400000,iso=t=>new Date(t).toISOString();
const initial=()=>({user_id:a,tier:'paid_member',status:'active',provider:'stripe',provider_customer_ref:customer,provider_subscription_ref:sid,valid_from:iso(now-86400000),valid_until:iso(end),membership_revision:4,cancel_at_period_end:false});
const snapshot=(paid=true,periodEnd=newEnd)=>({id:sid,livemode:false,customer,status:paid?'active':'past_due',metadata:{nbjb_user_id:a,nbjb_offer:offer,nbjb_environment:'qa'},items:{data:[{id:'si_fixture',price:{lookup_key:offer},current_period_start:(periodEnd-30*86400000)/1000,current_period_end:periodEnd/1000}]},created:Math.floor(now/1000),latest_invoice:{livemode:false,status:paid?'paid':'open',lines:{data:[{subscription_item:'si_fixture',period:{end:periodEnd/1000}}]}},cancel_at_period_end:false});
const env={SUPABASE_URL:'https://fgpkejlmpfkxgpktgdzm.supabase.co',NBJB_MEMBERSHIP_MODE:'qa',NBJB_MEMBERSHIP_QA_USER_IDS:a+','+b,NBJB_MEMBERSHIP_QA_STRIPE_SECRET_KEY:'sk_test_fixture_offline',NBJB_MEMBERSHIP_QA_STRIPE_WEBHOOK_SECRET:secret,NBJB_MEMBERSHIP_QA_STRIPE_ACCOUNT:'acct_fixture',NBJB_MEMBERSHIP_QA_SITE_URL:'http://localhost:3000'};
function load(file,bindings){
 const source=readFileSync(file,'utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','return {');
 // Function-body return needs a wrapping function for TS parser.
 const transpiled=stripTypeScriptTypes('function fixtureFactory(){\n'+source+'\n}',{mode:'transform'});
 return new Function(...Object.keys(bindings),transpiled+'\nreturn fixtureFactory();')(...Object.values(bindings));
}
function fixture({forceMiss=false,overlap=false,advanceOnMiss=false}={}){
 let member=initial(),sub=snapshot(false),reads=0,attempts=0,calls=0,release,arrivals=0;const receipts=new Map();
 const gate=new Promise(r=>release=r);const writes=[];
 const admin={from(table){
   let filters=[],changes,operation='select';const q={
     select(){return q},eq(k,v){filters.push([k,v]);return q},update(v){operation='update';changes=v;return q},
     async insert(v){if(receipts.has(v.event_id))return {error:{code:'23505'}};receipts.set(v.event_id,{...v});return {error:null}},
     async maybeSingle(){
       if(table==='membership_entitlements'){
         if(operation==='update'){
           attempts++;
           if(overlap&&++arrivals<=2){if(arrivals===2)release();await gate;}
           if(forceMiss||!filters.every(([k,v])=>member[k]===v)){
             if(advanceOnMiss)sub=snapshot(true);
             return {data:null,error:null};
           }
           member={...member,...changes,membership_revision:member.membership_revision+1};writes.push({...member});
           return {data:{user_id:a},error:null};
         }
         reads++;return {data:filters.every(([k,v])=>member[k]===v)?{...member}:null,error:null};
       }
       const row=[...receipts.values()].find(r=>filters.every(([k,v])=>r[k]===v));
       if(row&&operation==='update')Object.assign(row,changes);
       return {data:row?{...row}:null,error:null};
     },
     then(resolve,reject){return q.maybeSingle().then(resolve,reject)}
   };return q;
 }};
 const provider={webhooks:sdk.webhooks,accounts:{retrieveCurrent:async()=>({id:'acct_fixture'})},subscriptions:{retrieve:async()=>{calls++;return structuredClone(sub)}}};
 function Stripe(){return provider;}
 const handler=load('launch-backend-staging/stripe-live-webhook/index.ts',{withSupabase:(_,fn)=>fn,Stripe,claimReceipt,paymentBoundary,subscriptionConflict,retryMembershipRevision,billingEnvironment,Deno:{env:{get:k=>env[k]}}});
 const deliver=(id,type='invoice.paid',mode=false)=>{const event={id,object:'event',type,livemode:mode,created:Math.floor(Date.now()/1000),data:{object:type.startsWith('invoice.')?{id:'in_fixture',subscription:sid}:{id:sid,metadata:{nbjb_user_id:a}}}};const payload=JSON.stringify(event);const signature=sdk.webhooks.generateTestHeaderString({payload,secret});return handler.fetch(new Request('https://example.invalid/webhook',{method:'POST',body:payload,headers:{'stripe-signature':signature}}),{supabaseAdmin:admin})};
 return {deliver,receipts,writes,get member(){return member},get reads(){return reads},get calls(){return calls},get attempts(){return attempts},setSub:x=>sub=x};
}
test('signed sibling events overlap at actual handler CAS; loser recomputes fresh paid renewal',async()=>{
 const f=fixture({overlap:true,advanceOnMiss:true});
 const [x,y]=await Promise.all([f.deliver('evt_a','invoice.payment_failed'),f.deliver('evt_b','customer.subscription.updated')]);
 assert.deepEqual([x.status,y.status],[200,200]);assert.equal(f.attempts,3);
 assert.equal(f.member.status,'active');assert.equal(f.member.valid_until,iso(newEnd));
 assert.equal(f.reads,3);assert.equal(f.calls,5);assert.equal(f.receipts.size,2);
 assert.ok([...f.receipts.values()].every(r=>r.status==='processed'));
 assert.equal(f.writes[0].valid_until,iso(end),'unpaid period must not extend');
 const before=f.attempts;assert.equal((await f.deliver('evt_a')).status,200);assert.equal(f.attempts,before);
});
test('reordered old event retrieves current provider state, not event payload',async()=>{
 const f=fixture();f.setSub(snapshot(true));assert.equal((await f.deliver('evt_first')).status,200);
 assert.equal((await f.deliver('evt_old','invoice.payment_failed')).status,200);
 assert.equal(f.member.valid_until,iso(newEnd));assert.equal(f.member.status,'active');
});
test('persistent conflict exhausts bound, records failed, returns 503, never grants stale data',async()=>{
 const f=fixture({forceMiss:true});f.setSub(snapshot(true));const r=await f.deliver('evt_contention');
 assert.equal(r.status,503);assert.equal(f.attempts,MAX_REVISION_ATTEMPTS);assert.equal(f.member.valid_until,iso(end));assert.equal(f.receipts.get('evt_contention').status,'failed');assert.equal(f.receipts.get('evt_contention').error_message,'membership_revision_conflict');
});
test('wrong-mode signed delivery cannot create receipt or mutate entitlement',async()=>{
 const f=fixture();assert.equal((await f.deliver('evt_live','invoice.paid',true)).status,400);assert.equal(f.receipts.size,0);assert.equal(f.attempts,0);
});
test('actual reader response uses independent server clock and never releases body after expiry without a webhook',async()=>{
 const member={...initial(),valid_from:iso(end-86400000),valid_until:iso(end)};
 for(const [time,expected] of [[end-1,200],[end,403],[end+1,403]]){
   for(const status of ['active','past_due']){
     let lessonReads=0;const admin={from(table){const q={select(){return q},eq(){return q},async maybeSingle(){if(table==='membership_entitlements')return {data:{...member,status},error:null};lessonReads++;return {data:{content:{blocks:[{text:'fictional'}]}},error:null}}};return q}};
     const handler=load('supabase/functions/read-flamewalker-lesson/index.ts',{withSupabase:(_,fn)=>fn,Deno:{env:{get:()=>undefined}},Date:{now:()=>time,parse:Date.parse}});
     const response=await handler.fetch(new Request('https://example.invalid/reader',{method:'POST',body:JSON.stringify({slug:'father-wound',now:end-1000})}),{userClaims:{id:a},supabaseAdmin:admin});
     assert.equal(response.status,expected);assert.equal(lessonReads,expected===200?1:0);const json=await response.json();assert.equal(Boolean(json.lesson),expected===200);assert.match(response.headers.get('Cache-Control'),/no-store/);
   }
 }
});
test('retry helper does not swallow provider errors or wait beyond retry start budget',async()=>{
 let tries=0;await assert.rejects(retryMembershipRevision(async()=>{tries++;throw Error('provider_unavailable')}),/provider_unavailable/);assert.equal(tries,1);
 let t=0;tries=0;await assert.rejects(retryMembershipRevision(async()=>{tries++;t=45000;return false},{now:()=>t,random:()=>0,sleep:async()=>{throw Error('unexpected sleep')}}),/membership_revision_conflict/);assert.equal(tries,1);
});
