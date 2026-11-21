import test from "node:test";
import assert from "node:assert/strict";
import {LIVE_RUNTIME_REVIEWED, PRODUCTION_REF, LIVE_ORIGIN, VERIFIED_LIVE_ACCOUNT, liveConfigurationMatches, productionAllowed, validatePrice, verifySession, ownedDownload} from "./commerce-core.mjs";

const good = {
 mode:"production",key:"sk_live_PLACEHOLDER_NOT_A_REAL_KEY",
 url:"https://"+PRODUCTION_REF+".supabase.co",expectedRef:PRODUCTION_REF,
 origin:LIVE_ORIGIN,account:VERIFIED_LIVE_ACCOUNT
};

test("live context requires exact project, origin, account and live key",()=>{
 assert.equal(liveConfigurationMatches(good),true);
 for(const changes of [
  {key:"sk_test_example"},{key:"rk_test_example"},{mode:"sandbox"},
  {url:"https://fgpkejlmpfkxgpktgdzm.supabase.co"},
  {expectedRef:"fgpkejlmpfkxgpktgdzm"},{origin:"https://localhost:8443"},
  {origin:"https://www.notbrokenjustburning.com"},
  {account:"acct_1UIHnhGxoOD2zUCj"}
 ])assert.equal(liveConfigurationMatches({...good,...changes}),false,JSON.stringify(changes));
 assert.equal(LIVE_RUNTIME_REVIEWED,false);
 assert.equal(productionAllowed(good),false,"staged code never activates checkout");
});

test("Wave One Stripe Price requires a live one-time exact price",()=>{
 const p={slug:"boundary-builder-workbook",amount:1499,currency:"usd",stripe_price_id:"price_LIVE",stripe_product_id:"prod_LIVE",tax_behavior:"exclusive"};
 const price={id:"price_LIVE",product:"prod_LIVE",livemode:true,active:true,type:"one_time",currency:"usd",unit_amount:1499,tax_behavior:"exclusive"};
 assert.doesNotThrow(()=>validatePrice(price,p));
 for(const bad of [{livemode:false},{type:"recurring"},{unit_amount:1599},{tax_behavior:"inclusive"},{product:"prod_OTHER"},{id:"price_SANDBOX"}]){
  assert.throws(()=>validatePrice({...price,...bad},p),/price_mismatch/);
 }
 assert.throws(()=>validatePrice(price,{...p,slug:"hawk-complete-toolkit"}),/price_mismatch/);
});

test("live checkout reconciliation rejects test sessions, test payment intents and test charges",()=>{
 const id="11111111-1111-4111-8111-111111111111";
 const o={id,slug:"boundary-builder-workbook",currency:"usd",amount:1499,stripe_price_id:"price_LIVE",stripe_session_id:"cs_live_A"};
 const s={id:"cs_live_A",livemode:true,mode:"payment",metadata:{nbjb_commerce:"v1-live",order_id:id,slug:o.slug},client_reference_id:id,currency:"usd",amount_subtotal:1499,amount_total:1499,total_details:{amount_discount:0},status:"complete",payment_status:"paid",payment_intent:"pi_live_A"};
 const items={has_more:false,data:[{price:"price_LIVE",quantity:1,amount_subtotal:1499}]};
 const pi={id:"pi_live_A",livemode:true,metadata:{nbjb_commerce:"v1-live",order_id:id},status:"succeeded",currency:"usd",amount_received:1499};
 const charge={id:"ch_live_A",livemode:true,payment_intent:"pi_live_A",paid:true,amount:1499,amount_refunded:0,disputed:false};
 assert.equal(verifySession(s,items,o,pi,charge).state,"paid");
 for(const [session,intent,payment] of [[{...s,livemode:false},pi,charge],[s,{...pi,livemode:false},charge],[s,pi,{...charge,livemode:false}],[{...s,metadata:{...s.metadata,nbjb_commerce:"v1"}},pi,charge]]){
  assert.throws(()=>verifySession(session,items,o,intent,payment));
 }
});

test("a paid order needs its own exact SKU entitlement",()=>{
 const id="11111111-1111-4111-8111-111111111111",user="22222222-2222-4222-8222-222222222222";
 const order={id,user_id:user,slug:"boundary-builder-workbook",status:"paid"};
 const e={user_id:user,product_slug:order.slug,status:"active",source:"stripe_commerce",provider_entitlement_ref:id};
 assert.equal(ownedDownload(order,e,user,order.slug),true);
 assert.equal(ownedDownload(order,e,"other",order.slug),false);
 assert.equal(ownedDownload(order,e,user,"forge-workbook"),false);
 assert.equal(ownedDownload({...order,status:"refunded"},e,user,order.slug),false);
});
