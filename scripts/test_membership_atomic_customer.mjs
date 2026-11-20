import test from 'node:test';
import assert from 'node:assert/strict';
import {bindMembershipCustomer} from '../launch-backend-staging/create-live-checkout-session/customer-binding.mjs';
const userId='00000000-0000-4000-8000-000000000001',environment={live:true,tag:'live'};
const args={userId,email:'fictional@example.invalid',environment};
function fixture({row={provider:null,provider_customer_ref:null},overlap=false,ambiguous=false,wrongOwner=false}={}){
 let calls=0,writes=0,arrivals=0,release;
 const clients=new Map(),gate=new Promise(r=>release=r);
 const make=id=>({id,livemode:true,metadata:{nbjb_user_id:wrongOwner?'other':userId,nbjb_environment:'live'}});
 if(row.provider_customer_ref)clients.set(row.provider_customer_ref,make(row.provider_customer_ref));
 const stripe={customers:{async create(){const id='cus_fixture_'+(++calls);const c=make(id);clients.set(id,c);if(overlap){if(++arrivals===2)release();await gate;}return c},async retrieve(id){return clients.get(id)}}};
 const admin={from(){let changes,filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},update(v){changes=v;return q},async single(){return {data:{...row},error:null}},async maybeSingle(){if(filters.some(([k,v])=>k!=='user_id'&&row[k]!==v))return {data:null,error:null};Object.assign(row,changes);writes++;if(ambiguous)return {error:{message:'response lost'}};return {data:{provider_customer_ref:row.provider_customer_ref},error:null}}};return q}};
 return {stripe,admin,row,get calls(){return calls},get writes(){return writes}};
}
test('two distinct provider customers returned across key retention: only canonical winner ever reaches checkout',async()=>{
 const f=fixture({overlap:true});
 const result=await Promise.all([bindMembershipCustomer(f.admin,f.stripe,args),bindMembershipCustomer(f.admin,f.stripe,args)]);
 assert.equal(f.calls,2);assert.equal(f.writes,1);assert.equal(result[0],result[1]);assert.equal(result[0],f.row.provider_customer_ref);
});
test('ambiguous mapping response: next request uses saved canonical mapping, does not create again',async()=>{
 const f=fixture({ambiguous:true});
 await assert.rejects(bindMembershipCustomer(f.admin,f.stripe,args),/customer_mapping_unavailable/);
 const winner=await bindMembershipCustomer(f.admin,f.stripe,args);assert.equal(winner,f.row.provider_customer_ref);assert.equal(f.calls,1);assert.equal(f.writes,1);
});
test('existing mapped customer is retrieved, never recreated or overwritten',async()=>{
 const f=fixture({row:{provider:'stripe',provider_customer_ref:'cus_existing'}});
 assert.equal(await bindMembershipCustomer(f.admin,f.stripe,args),'cus_existing');assert.equal(f.calls,0);assert.equal(f.writes,0);
});
test('wrong ownership or nonstripe historical reference fails closed',async()=>{
 const f=fixture({wrongOwner:true});await assert.rejects(bindMembershipCustomer(f.admin,f.stripe,args),/customer_mapping_review/);assert.equal(f.writes,0);
 const g=fixture({row:{provider:'legacy',provider_customer_ref:'cus_other'}});await assert.rejects(bindMembershipCustomer(g.admin,g.stripe,args),/customer_mapping_review/);assert.equal(g.calls,0);
});
test('server hold overrides canary and canonical binding precedes reservation',async()=>{
 const {readFileSync}=await import('node:fs');const code=readFileSync('launch-backend-staging/create-live-checkout-session/index.ts','utf8');assert.match(code,/Deno.env.get\("NBJB_LIVE_CHECKOUT_PAUSED"\) === "true" \|\|/);
 assert.ok(code.indexOf('await bindMembershipCustomer')<code.indexOf('await reservedCheckout'));
});
