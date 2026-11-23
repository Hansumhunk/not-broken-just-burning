import test from "node:test";
import assert from "node:assert/strict";
import {WB001_PUBLIC_RELEASE,WB001_ASSET_KEY,WB001_RETAIL_CENTS,WB001_MEMBER_CENTS,
  paidMemberEligible,determineOffer,verifyConfiguredProduct,verifyStripePrice,verifyPaidProvider,
  nextOrderState,authorizeDirectDownload,validGuestEmail} from "./wb001-core.mjs";
const now=Date.parse("2026-11-22T20:00:00Z");
const paid={tier:"paid_member",status:"active",source:"stripe_subscription",provider:"stripe",
  provider_subscription_ref:"sub_fixture",valid_from:"2026-11-01T00:00:00Z",valid_until:"2026-12-02T00:00:00Z",cancel_at_period_end:true};
const user={id:"22222222-2222-4222-8222-222222222222"};
const product={slug:"from-chaos-to-clarity",active:true,currency:"usd",amount:1799,member_amount:999,
  stripe_price_id:"price_retail",member_stripe_price_id:"price_member",stripe_product_id:"prod_wb001",
  tax_code:"txcd_10302000",tax_behavior:"exclusive",terms_version:"wb001-v1",
  asset_version:"v1.0",asset_key:WB001_ASSET_KEY,download_name:"NBJB-WB-001_v1.0_customer.zip"};
test("source release remains locked and exact prices fixed",()=>{
  assert.equal(WB001_PUBLIC_RELEASE,false);assert.equal(WB001_RETAIL_CENTS,1799);assert.equal(WB001_MEMBER_CENTS,999);
});
test("guest without a Flamewalker account is always retail",()=>{
  assert.deepEqual(determineOffer({guest:true}),{kind:"guest",tier:"retail",amount:1799});
  assert.throws(()=>determineOffer({guest:true,user}),/ambiguous/);
  assert.throws(()=>determineOffer({}),/unverified/);
});
test("current paid-through subscription is eligible, even with scheduled cancellation",()=>{
  assert.equal(paidMemberEligible(paid,now),true);
  assert.equal(determineOffer({user,membership:paid}).amount,999);
  for(const override of [{status:"past_due"},{tier:"free"},{source:"account_default"},{provider:"manual"},
    {provider_subscription_ref:null},{valid_until:"2026-11-22T19:00:00Z"},{valid_from:"2026-12-01T00:00:00Z"},
    {valid_until:null},{provider:"sandbox"}]) {
    const p={...paid,...override};
    assert.equal(paidMemberEligible(p,now),false,JSON.stringify(override));
  }
  // Eventual expiry uses current clock, not the static browser's last-known paid flag.
  assert.equal(paidMemberEligible(paid,Date.parse("2026-12-03T00:00:00Z")),false);
  assert.equal(determineOffer({user,membership:null}).amount,1799);
});
test("trusted provider product and immutable one-time Price must agree exactly",()=>{
  const offer={tier:"member",amount:999};
  const stripePrice={id:"price_member",livemode:true,active:true,type:"one_time",currency:"usd",
    unit_amount:999,product:"prod_wb001",tax_behavior:"exclusive"};
  assert.equal(verifyConfiguredProduct(product,offer),"price_member");
  assert.doesNotThrow(()=>verifyStripePrice(stripePrice,product,offer));
  for(const changes of [{livemode:false},{unit_amount:1799},{type:"recurring"},{tax_behavior:"inclusive"},
    {product:"prod_fake"},{id:"price_retail"},{active:false}])
    assert.throws(()=>verifyStripePrice({...stripePrice,...changes},product,offer));
  assert.throws(()=>verifyConfiguredProduct({...product,active:false},offer));
  assert.throws(()=>verifyConfiguredProduct({...product,member_amount:799},offer));
  assert.throws(()=>verifyConfiguredProduct({...product,asset_key:"public/file.pdf"},offer));
});
const order={id:"11111111-1111-4111-8111-111111111111",slug:product.slug,
  buyer_kind:"member",user_id:user.id,amount:999,status:"pending",stripe_price_id:"price_member",
  stripe_session_id:"cs_live_fixture",asset_key:WB001_ASSET_KEY,asset_version:"v1.0",refunded_amount:0};
const session={id:"cs_live_fixture",livemode:true,mode:"payment",
  metadata:{nbjb_commerce:"wb001-v1-live",order_id:order.id,slug:order.slug},
  client_reference_id:order.id,currency:"usd",amount_subtotal:999,amount_total:999,
  total_details:{amount_discount:0},status:"complete",payment_status:"paid",payment_intent:"pi_live_fixture"};
const items={has_more:false,data:[{price:"price_member",amount_subtotal:999,quantity:1}]};
const pi={id:"pi_live_fixture",livemode:true,status:"succeeded",metadata:{nbjb_commerce:"wb001-v1-live",order_id:order.id},
  currency:"usd",amount_received:999};
const charge={livemode:true,paid:true,payment_intent:pi.id,amount:999,amount_refunded:0,disputed:false};
test("webhook reconciliation never trusts redirect or unverified provider snapshots",()=>{
  assert.equal(verifyPaidProvider({order,session,items,paymentIntent:pi,charge}),"paid");
  for(const changes of [{livemode:false},{amount_subtotal:1799},{id:"cs_bad"},
    {metadata:{...session.metadata,order_id:"tampered"}},{total_details:{amount_discount:100}}])
    assert.throws(()=>verifyPaidProvider({order,session:{...session,...changes},items,paymentIntent:pi,charge}));
  assert.throws(()=>verifyPaidProvider({order,session,items,paymentIntent:{...pi,livemode:false},charge}));
  assert.throws(()=>verifyPaidProvider({order,session,items,paymentIntent:pi,charge:{...charge,livemode:false}}));
  assert.equal(verifyPaidProvider({order,session,items,paymentIntent:pi,charge:{...charge,amount_refunded:999}}),"refunded");
  assert.equal(verifyPaidProvider({order,session,items,paymentIntent:pi,charge:{...charge,disputed:true}}),"disputed");
});
test("duplicate, delayed, refund, disputed, and stale event states fail closed",()=>{
  for(const state of ["refunded","disputed"])assert.equal(nextOrderState(state,"paid"),state);
  assert.equal(nextOrderState("paid","pending"),"paid");
  assert.equal(nextOrderState("paid","refunded"),"refunded");
  assert.equal(nextOrderState("expired","paid"),"review");
  assert.throws(()=>nextOrderState("paid","made-up"));
});
test("owned member and guest downloads require proper principal, paid order and live claim",()=>{
  assert.equal(authorizeDirectDownload({...order,status:"paid"},{userId:user.id}),true);
  assert.equal(authorizeDirectDownload({...order,status:"paid"},{userId:"someone_else"}),false);
  assert.equal(authorizeDirectDownload({...order,status:"refunded"},{userId:user.id}),false);
  const guest={...order,status:"paid",buyer_kind:"guest",user_id:null,
    claim_nonce:"sample",receipt_sent_at:"2026-11-22T19:50:00Z",claim_expires_at:"2026-11-23T20:00:00Z"};
  assert.equal(!!authorizeDirectDownload(guest,{claimNonce:"sample",now}),true);
  assert.equal(authorizeDirectDownload(guest,{claimNonce:"bad",now}),false);
  assert.equal(authorizeDirectDownload({...guest,receipt_sent_at:null},{claimNonce:"sample",now}),false);
  assert.equal(authorizeDirectDownload({...guest,refunded_amount:1},{claimNonce:"sample",now}),false);
  assert.equal(authorizeDirectDownload(guest,{claimNonce:"sample",now:Date.parse("2026-11-24T20:00:00Z")}),false);
});
test("guest email syntax bounded",()=>{
  assert.equal(validGuestEmail("reader@example.com"),true);
  for(const email of ["", "no-at-sign", "a@example", "x".repeat(260), "x@foo.com\r\nBcc: test@example.com"])
    assert.equal(validGuestEmail(email),false);
});
