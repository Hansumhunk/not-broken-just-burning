import test from "node:test";import assert from "node:assert/strict";
import {createWB001Service} from "./wb001-operations.mjs";
import {signGuestClaim} from "./wb001-guest-claim.mjs";
import {WB001_ASSET_KEY,paidMemberEligible} from "./wb001-core.mjs";
const user={id:"11111111-1111-4111-8111-111111111111",email:"reader@example.org"};
const uuid="22222222-2222-4222-8222-222222222222",nonce="33333333-3333-4333-8333-333333333333";
const member={tier:"paid_member",status:"active",source:"stripe_subscription",provider:"stripe",
 provider_subscription_ref:"sub_qa",valid_from:"2026-11-01T00:00:00Z",valid_until:"2026-12-02T00:00:00Z"};
const product={slug:"from-chaos-to-clarity",active:true,amount:1799,member_amount:999,
  stripe_price_id:"price_retail",member_stripe_price_id:"price_member",stripe_product_id:"prod_wb001",
  tax_code:"txcd_10302000",tax_behavior:"exclusive",terms_version:"wb001-v1",
  asset_version:"v1.0",asset_key:WB001_ASSET_KEY,download_name:"NBJB-WB-001_v1.0_customer.zip",currency:"usd"};
const now=Date.parse("2026-11-22T20:00:00Z");
function fixture({guest=false,providerActive=true,assetReady=true,abuse=true}={}){
 const calls={prices:[],checkouts:[],emails:[],binds:[],downloads:[],events:[],abuseChecks:0};
 let current=guest?null:member;
 let row=null,outbox=null,entitlement=null;
 const store={
  membership:async()=>current,product:async()=>product,
  reserve:async({userId,guestEmail})=>{
   const offer=userId && paidMemberEligible(current,now) && providerActive? "member":"retail";
   row={id:uuid,slug:product.slug,buyer_kind:userId?"member":"guest",price_tier:offer,user_id:userId,
     guest_email:guestEmail,amount:offer==="member"?999:1799,
     stripe_price_id:offer==="member"?"price_member":"price_retail",
     stripe_session_id:null,status:"pending",tax_behavior:"exclusive",terms_version:"wb001-v1",
     asset_version:"v1.0",asset_key:WB001_ASSET_KEY,claim_nonce:nonce,claim_expires_at:null,
     receipt_sent_at:null,refunded_amount:0,review_required:false};return row;},
  bindSession:async(id,session)=>{row.stripe_session_id=session;calls.binds.push([id,session]);},
  order:async()=>row, outbox:async()=>outbox,
  markReceipt:async()=>{row.receipt_sent_at=new Date(now).toISOString();row.claim_expires_at="2026-12-02T20:00:00Z";outbox.status="sent";},
  memberEntitlement:async()=>entitlement,
  reconcile:async(evt)=>{
   if(calls.events.find(e=>e.event===evt.event))return;
   calls.events.push(evt);
   if(row.status==="refunded"||row.status==="disputed")return;
   if(evt.state==="paid"){row.status="paid";if(row.buyer_kind==="guest"&&evt.email===row.guest_email)outbox={status:"pending"};else if(row.buyer_kind==="member")entitlement={status:"active",source:"stripe_commerce",provider_entitlement_ref:uuid};}
   if(evt.state==="refunded"||evt.state==="disputed"){row.status=evt.state;row.refunded_amount=evt.refunded;if(entitlement)entitlement.status="revoked";if(outbox)outbox.status="hold";}
  }
 };
 const provider={
  verifyLiveSubscription:async()=>providerActive,
  price:async id=>{calls.prices.push(id);return {id,livemode:true,active:true,type:"one_time",currency:"usd",
    unit_amount:id==="price_member"?999:1799,product:"prod_wb001",tax_behavior:"exclusive"};},
  createCheckout:async p=>{calls.checkouts.push(p);return {id:"cs_live_fixture",livemode:true,mode:"payment",status:"open",url:"https://checkout.stripe.com/c/pay_fixture",metadata:{order_id:uuid}};},
  checkoutSession:async()=>null,
  snapshot:async()=>({session:{id:"cs_live_fixture",livemode:true,mode:"payment",
    metadata:{nbjb_commerce:"wb001-v1-live",order_id:uuid,slug:product.slug},
    client_reference_id:uuid,currency:"usd",amount_subtotal:row.amount,amount_total:row.amount,
    total_details:{amount_discount:0},status:"complete",payment_status:"paid",payment_intent:"pi_live_fixture",customer_details:{email:row.guest_email}},
    items:{has_more:false,data:[{price:row.stripe_price_id,quantity:1,amount_subtotal:row.amount}]},
    paymentIntent:{id:"pi_live_fixture",livemode:true,status:"succeeded",currency:"usd",amount_received:row.amount,
      metadata:{nbjb_commerce:"wb001-v1-live",order_id:uuid}},
    charge:{livemode:true,paid:true,amount:row.amount,amount_refunded:0,disputed:false,payment_intent:"pi_live_fixture"}})
 };
 const delivery={
  assertPrivateAsset:async()=>{if(!assetReady)throw Error("asset_not_ready");},
  sendGuestReceipt:async x=>calls.emails.push(x),
  signDownload:async (order,seconds)=>{calls.downloads.push([order,seconds]);return {url:"https://example.supabase.co/storage/v1/object/sign/private",expiresIn:seconds};}
 };
 const svc=createWB001Service({store,provider,delivery,verifyAbuse:async()=>{calls.abuseChecks++;return abuse;},claimSecret:"s".repeat(64),clock:()=>now});
 return {svc,calls,store,provider,row:()=>row,setMember:v=>current=v,setOutbox:v=>outbox=v};
}
test("guest buyer without registration receives RETAIL checkout, then paid email claim and expiring signed asset",async()=>{
 const f=fixture({guest:true});
 await f.svc.checkout({guestEmail:"guest@example.org",acceptedTerms:true,termsVersion:"wb001-v1",abuseProof:"synthetic"});
 assert.deepEqual(f.calls.prices,["price_retail"]);assert.equal(f.calls.checkouts[0].order.amount,1799);assert.equal(f.calls.abuseChecks,1);
 const r=await f.svc.reconcileVerifiedSession("cs_live_fixture","evt_1");assert.equal(r.state,"paid");
 assert.equal(f.calls.emails.length,1);assert.match(f.calls.emails[0].url,/#order=/);
 const claim=await signGuestClaim(f.row(),"s".repeat(64));
 const dl=await f.svc.downloadGuest({orderId:uuid,claim});
 assert.equal(dl.expiresIn,60);
 await assert.rejects(f.svc.downloadGuest({orderId:uuid,claim:"tampered"}),/not_owned/);
});
test("paid member has $9.99 server-verified price, expired member does not",async()=>{
 const f=fixture();
 await f.svc.checkout({user,acceptedTerms:true,termsVersion:"wb001-v1"});
 assert.equal(f.calls.checkouts[0].order.amount,999);
 f.setMember({...member,valid_until:"2026-11-20T00:00:00Z"});
 await f.svc.checkout({user,acceptedTerms:true,termsVersion:"wb001-v1"});
 assert.equal(f.calls.checkouts[1].order.amount,1799);
});
test("failed LIVE subscription attestation and missing customer ZIP fail CLOSED before charging",async()=>{
 const a=fixture({providerActive:false});
 await assert.rejects(a.svc.checkout({user,acceptedTerms:true,termsVersion:"wb001-v1"}),/membership_provider_mismatch/);
 assert.equal(a.calls.checkouts.length,0);
 const b=fixture({guest:true,assetReady:false});
 await assert.rejects(b.svc.checkout({guestEmail:"guest@example.org",acceptedTerms:true,termsVersion:"wb001-v1"}),/asset_not_ready/);
 assert.equal(b.calls.checkouts.length,0);
});
test("abuse control, terms, malformed email block guest checkout",async()=>{
 const f=fixture({guest:true,abuse:false});
 await assert.rejects(f.svc.checkout({guestEmail:"guest@example.org",acceptedTerms:true,termsVersion:"wb001-v1"}),/abuse_proof_required/);
 await assert.rejects(f.svc.checkout({guestEmail:"oops",acceptedTerms:true,termsVersion:"wb001-v1"}),/invalid_email/);
 await assert.rejects(f.svc.checkout({guestEmail:"guest@example.org"}),/terms_required/);
 assert.equal(f.calls.checkouts.length,0);
});
test("duplicate signed events issue no duplicate receipt, refund revokes access even with old claim",async()=>{
 const f=fixture({guest:true});
 await f.svc.checkout({guestEmail:"guest@example.org",acceptedTerms:true,termsVersion:"wb001-v1",abuseProof:"synthetic"});
 await f.svc.reconcileVerifiedSession("cs_live_fixture","evt_1");
 await f.svc.reconcileVerifiedSession("cs_live_fixture","evt_1");
 assert.equal(f.calls.emails.length,1);
 const claim=await signGuestClaim(f.row(),"s".repeat(64));
 await f.store.reconcile({event:"evt_refund",state:"refunded",refunded:1799});
 await assert.rejects(f.svc.downloadGuest({orderId:uuid,claim}),/not_owned/);
});
