import test from "node:test";
import assert from "node:assert/strict";
import {LIVE_RUNTIME_REVIEWED, PRODUCTION_REF, LIVE_ORIGIN, VERIFIED_LIVE_ACCOUNT, liveConfigurationMatches, productionAllowed, permittedCheckout, approvedBoundaryRelease, BOUNDARY_APPROVED_RELEASE, approvedForgeRelease, FORGE_APPROVED_RELEASE, validatePrice, verifySession, ownedDownload} from "./commerce-core.mjs";

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
 for(const [slug,amount] of [["masculine-restoration-guide",2499],["hawk-complete-toolkit",4999]]) {
  const candidate={...p,slug,amount,stripe_price_id:"price_"+slug,stripe_product_id:"prod_"+slug};
  const provider={...price,id:candidate.stripe_price_id,product:candidate.stripe_product_id,unit_amount:amount};
  assert.doesNotThrow(()=>validatePrice(provider,candidate),slug);
  assert.throws(()=>validatePrice({...provider,unit_amount:amount+100},candidate),/price_mismatch/);
 }
 assert.throws(()=>validatePrice({...price,unit_amount:2499},{...p,slug:"30-days-through-the-fire",amount:2499}),/price_mismatch/);
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

test("live canary never opens purchases to any other user or SKU",()=>{
 const buyer="11111111-1111-4111-8111-111111111111";
 const other="22222222-2222-4222-8222-222222222222";
 const a={gate:"canary",userId:buyer,slug:"boundary-builder-workbook",canaryUserId:buyer,canarySlug:"boundary-builder-workbook"};
 assert.equal(permittedCheckout(a),true);
 for(const changes of [{userId:other},{canaryUserId:other},{canaryUserId:""},
  {slug:"forge-workbook"},{canarySlug:"forge-workbook"},
  {gate:"disabled"},{gate:"test"},{gate:"sandbox"}]){
  assert.equal(permittedCheckout({...a,...changes}),false,JSON.stringify(changes));
 }
 assert.equal(permittedCheckout({...a,gate:"enabled"}),false);
 assert.equal(permittedCheckout({...a,gate:"enabled",slug:"forge-workbook"}),false);
 assert.equal(permittedCheckout({...a,slug:"forge-workbook",canarySlug:"forge-workbook"}),false);
 assert.equal(permittedCheckout({...a,gate:"enabled",slug:"30-days-through-the-fire"}),false);
 assert.equal(permittedCheckout({...a,gate:"canary",canaryUserId:"not-a-uuid"}),false);
});

test("Boundary Builder checkout accepts only frozen 004-C v1.4 bytes path and matching live Stripe product version",()=>{
 const b=BOUNDARY_APPROVED_RELEASE;
 const p={slug:b.slug,asset_version:b.asset_version,asset_key:b.asset_key,download_name:b.download_name};
 const provider={metadata:{sku:"NBJB-BB-001",version:"1.4"}};
 assert.equal(approvedBoundaryRelease(p,provider),true);
 for(const altered of [
  {asset_version:"v1.3"},
  {asset_key:"boundary-builder-workbook/v1.3/NBJB-BB-001_v1.3_customer.zip"},
  {asset_key:"boundary-builder-workbook/v1.4/NBJB-BB-001_v1.4_INTERNAL.zip"},
  {download_name:"NBJB-BB-001_v1.3_customer.zip"},
  {asset_version:null},
  {asset_key:null}
 ]) assert.equal(approvedBoundaryRelease({...p,...altered},provider),false,JSON.stringify(altered));
 assert.equal(approvedBoundaryRelease(p,{metadata:{sku:"NBJB-BB-001",version:"1.3"}}),false);
 assert.equal(approvedBoundaryRelease(p,{metadata:{sku:"OTHER",version:"1.4"}}),false);
 assert.equal(approvedBoundaryRelease(p,{}),false);
 assert.equal(approvedBoundaryRelease({...p,slug:"forge-workbook"},{}),true,"Separate Forge release awaits its own accepted edition gate");
});

test("The Forge stays release-locked to frozen v1.3 identity without activating sale",()=>{
 const a=FORGE_APPROVED_RELEASE;
 const p={slug:a.slug,asset_version:a.asset_version,asset_key:a.asset_key,download_name:a.download_name};
 const provider={metadata:{sku:"NBJB-FG-002",version:"1.3"}};
 assert.equal(approvedForgeRelease(p,provider),true);
 for(const changed of [
  {asset_version:"v1"},{asset_version:null},
  {asset_key:"forge-workbook/v1/qa.pdf"},
  {asset_key:"forge-workbook/v1.2/NBJB-FG-002_v1.2_customer.zip"},
  {download_name:"NBJB-FG-002_v1.2_customer.zip"},{download_name:null}
 ]) assert.equal(approvedForgeRelease({...p,...changed},provider),false,JSON.stringify(changed));
 assert.equal(approvedForgeRelease(p,{metadata:{sku:"NBJB-FG-002",version:"1.2"}}),false);
 assert.equal(approvedForgeRelease(p,{metadata:{sku:"OTHER",version:"1.3"}}),false);
 assert.equal(approvedForgeRelease(p,{}),false);
 assert.equal(approvedForgeRelease({...p,slug:"boundary-builder-workbook"},{}),true);
});
