import test from 'node:test';
import assert from 'node:assert/strict';
import {reservedCheckout, retryAllowed, RETRY_MS, ownedSession} from '../launch-backend-staging/create-live-checkout-session/reserved-checkout.mjs';
const userId='synthetic-a',customerId='cus_fixture',monthly='flamewalker_plus_monthly',annual='flamewalker_plus_annual';
const now=Date.parse('2026-11-19T12:00:00Z');
function fixture(){
 let row=null, sessions=[], requests=[], failOnce=false;
 const admin={
   from(){let filters=[],action='select',changes={};const query={
     select(){return query},eq(k,v){filters.push([k,v]);return query},is(k,v){filters.push([k,v]);return query},
     update(v){action='update';changes=v;return query},
     maybeSingle(){if(!row||!filters.every(([k,v])=>row[k]===v))return Promise.resolve({data:null,error:null});if(action==='update')Object.assign(row,changes);return Promise.resolve({data:{...row},error:null})},
     single(){return query.maybeSingle()}
   };return query},
   rpc(_name,p){return {single:async()=>{if(!row||row.released_at)row={attempt_id:p.p_attempt,user_id:p.p_user,offer:p.p_offer,customer_ref:p.p_customer,request_body:p.p_request,provider_key:'key-'+p.p_attempt,created_at:new Date(now).toISOString(),session_ref:null,released_at:null};return {data:{...row},error:null}}}}
 };
 const stripe={subscriptions:{list:async()=>({data:[],has_more:false}),retrieve:async()=>({customer:customerId,status:'canceled'})},checkout:{sessions:{
   list:async({status})=>({data:sessions.filter(s=>!status||s.status===status),has_more:false}),
   retrieve:async id=>sessions.find(s=>s.id===id),
   create:async(body,opts)=>{requests.push({body,key:opts.idempotencyKey});let s=sessions.find(s=>s.metadata.nbjb_attempt===body.metadata.nbjb_attempt);if(!s){s={id:'cs_'+body.metadata.nbjb_attempt,mode:'subscription',customer:customerId,client_reference_id:userId,metadata:body.metadata,status:'open',url:'https://example.invalid/checkout'};sessions.push(s)}if(failOnce){failOnce=false;throw Error('lost response')}return s}
 }}};
 return {admin,stripe,requests,get row(){return row},get sessions(){return sessions},fail(){failOnce=true},forgetProvider(){sessions=[]}};
}
const input=(offerSlug=monthly,price='price_original')=>({userId,customerId,offerSlug,request:{mode:'subscription',line_items:[{price,quantity:1}],metadata:{nbjb_offer:offerSlug}}});
test('concurrent conflicting offers share one reservation (mock provider/adapter)',async()=>{
 const f=fixture();
 const results=await Promise.all([reservedCheckout(f.admin,f.stripe,input(),()=>now),reservedCheckout(f.admin,f.stripe,input(annual),()=>now)]);
 assert.equal(results.filter(x=>x.url).length,1);assert.equal(f.requests.length,1);assert.equal(f.row.offer,monthly);
});
test('lost response recovered from exact provider metadata; no second create',async()=>{
 const f=fixture();f.fail();
 await assert.rejects(reservedCheckout(f.admin,f.stripe,input(),()=>now));
 assert.equal(f.row.session_ref,null);
 assert.equal((await reservedCheckout(f.admin,f.stripe,input(monthly,'changed_price'),()=>now+RETRY_MS+1)).url,'https://example.invalid/checkout');
 assert.equal(f.requests.length,1);
 assert.ok(ownedSession(f.sessions[0],f.row));
});
test('unknown attempt retries original request/key only within limit; after cutoff no create',async()=>{
 const f=fixture();f.fail();await assert.rejects(reservedCheckout(f.admin,f.stripe,input(),()=>now));
 f.forgetProvider();f.fail();
 await assert.rejects(reservedCheckout(f.admin,f.stripe,input(monthly,'changed'),()=>now+1));
 assert.deepEqual(f.requests[0],f.requests[1]);f.forgetProvider();
 assert.equal((await reservedCheckout(f.admin,f.stripe,input(),()=>now+RETRY_MS)).error,'checkout_outcome_review');
 assert.equal(f.requests.length,2);assert.equal(retryAllowed(f.row,now+RETRY_MS),false);
});
test('provider-confirmed expired session releases reservation, next attempt gets a fresh key',async()=>{
 const f=fixture();await reservedCheckout(f.admin,f.stripe,input(),()=>now);const key=f.row.provider_key;f.sessions[0].status='expired';
 assert.equal((await reservedCheckout(f.admin,f.stripe,input(annual),()=>now)).error,'checkout_retry_after_terminal');
 assert.ok(f.row.released_at);
 await reservedCheckout(f.admin,f.stripe,input(annual),()=>now);assert.notEqual(f.row.provider_key,key);
});
