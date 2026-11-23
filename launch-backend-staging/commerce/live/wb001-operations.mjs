// WB-001 ONE-TIME COMMERCE: testable orchestration over the EXISTING commerce adapter.
// All side effects are injected. Deployed entrypoint remains hard-locked pending release.
import {
 WB001_SLUG, WB001_ASSET_KEY, WB001_DOWNLOAD_SECONDS, paidMemberEligible,
 determineOffer,verifyConfiguredProduct,verifyStripePrice,verifyPaidProvider,authorizeDirectDownload,validGuestEmail
} from "./wb001-core.mjs";
import {signGuestClaim,verifyGuestClaim,guestReceiptLink} from "./wb001-guest-claim.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertOrderSnapshot(order,offer,priceId,product) {
 if(!order || !UUID.test(order.id||"") || order.slug!==WB001_SLUG
   || order.buyer_kind!==offer.kind || order.price_tier!==offer.tier
   || order.amount!==offer.amount || order.stripe_price_id!==priceId
   || order.tax_behavior!==product.tax_behavior || order.terms_version!==product.terms_version
   || order.asset_key!==WB001_ASSET_KEY || order.asset_version!=="v1.0")
   throw Error("order_snapshot_mismatch");
}
function safeCheckoutUrl(value) {
 const u=new URL(value);
 if(u.protocol!=="https:" || u.hostname!=="checkout.stripe.com")throw Error("untrusted_checkout");
 return u.href;
}
export function createWB001Service({store,provider,delivery,verifyAbuse,claimSecret,origin="https://notbrokenjustburning.com",clock=Date.now}) {
 if(!store||!provider||!delivery||!verifyAbuse)throw Error("dependencies_missing");
 if(origin!=="https://notbrokenjustburning.com")throw Error("origin_mismatch");
 return Object.freeze({
  async checkout({user=null,guestEmail=null,abuseProof=null,acceptedTerms=false,termsVersion=null}={}) {
   if(!acceptedTerms||!termsVersion)throw Error("terms_required");
   const guest=user===null;
   let email=null,membership=null;
   if(guest) {
    if(!validGuestEmail(guestEmail))throw Error("invalid_email");
    email=guestEmail.trim().toLowerCase();
    if(!await verifyAbuse(abuseProof))throw Error("abuse_proof_required");
   } else {
    if(!UUID.test(user.id||"")||!user.email)throw Error("identity_unverified");
    membership=await store.membership(user.id);
   }
   let offer=determineOffer({user,membership,guest});
   // An account claiming Plus must agree with an ACTIVE provider subscription in LIVE mode.
   // A failed provider lookup must fail the whole checkout; never silently charge retail.
   if(!guest && paidMemberEligible(membership,clock())) {
    if(!await provider.verifyLiveSubscription(membership))throw Error("membership_provider_mismatch");
   }
   const product=await store.product(WB001_SLUG);
   if(!product||product.terms_version!==termsVersion)throw Error("product_not_available");
   const priceId=verifyConfiguredProduct(product,offer);
   const price=await provider.price(priceId);
   verifyStripePrice(price,product,offer);
   await delivery.assertPrivateAsset(product);
   const order=await store.reserve({slug:WB001_SLUG,userId:guest?null:user.id,guestEmail:email,terms:termsVersion});
   assertOrderSnapshot(order,offer,priceId,product);
   if(order.status!=="pending")throw Error("order_not_pending");
   let session=order.stripe_session_id?await provider.checkoutSession(order.stripe_session_id):null;
   if(!session){
    session=await provider.createCheckout({
      order,customerEmail:guest?email:user.email,successUrl:origin+(guest?"/commerce-guest-access.html?return=success":"/commerce-result.html?return=success")+"&order="+order.id,
      cancelUrl:origin+(guest?"/commerce-guest-access.html?return=cancel":"/commerce-result.html?return=cancel")+"&order="+order.id,
      idempotencyKey:"nbjb-wb001-live-"+order.id
    });
    await store.bindSession(order.id,session.id);
   }
   if(session.livemode!==true||session.mode!=="payment"||session.metadata?.order_id!==order.id||session.status!=="open")
     throw Error("provider_checkout_mismatch");
   return {url:safeCheckoutUrl(session.url),order:order.id};
  },
  async reconcileVerifiedSession(sessionId,eventId) {
   const snapshot=await provider.snapshot(sessionId);
   const {session,items,paymentIntent,charge}=snapshot;
   if(session.metadata?.nbjb_commerce!=="wb001-v1-live")return {ignored:true};
   const order=await store.order(session.metadata.order_id);
   if(!order||order.slug!==WB001_SLUG)throw Error("unknown_order");
   // The original webhook can arrive before async checkout-session DB binding.
   const checkedOrder={...order,stripe_session_id:order.stripe_session_id||session.id};
   const state=verifyPaidProvider({session,items,paymentIntent,charge,order:checkedOrder});
   // Verify recipient identity against the buyer email originally accepted by Stripe Checkout.
   // A mismatch is paid but held for operator review, not delivered to an attacker.
   const email=session.customer_details?.email?.trim().toLowerCase()||null;
   await store.reconcile({
    order:order.id,event:eventId,session:session.id,intent:paymentIntent?.id||null,
    state,total:session.amount_total,refunded:charge?.amount_refunded||0,email
   });
   if(state==="paid"&&order.buyer_kind==="guest")await this.deliverGuest(order.id);
   return {state};
  },
  async deliverGuest(orderId) {
   const order=await store.order(orderId);
   const outbox=await store.outbox(orderId);
   if(!order||order.buyer_kind!=="guest"||order.status!=="paid"
     ||order.review_required||order.refunded_amount>0||outbox?.status!=="pending")
      return {sent:false};
   // Generating a claim never grants entitlement. Authorization still checks paid state on every download.
   const signature=await signGuestClaim({...order,claim_nonce:order.claim_nonce},claimSecret);
   const link=guestReceiptLink(origin,{...order,claim_nonce:order.claim_nonce},signature);
   await delivery.sendGuestReceipt({to:order.guest_email,orderId:order.id,url:link,product:WB001_SLUG});
   await store.markReceipt(order.id);
   return {sent:true};
  },
  async downloadMember({user,orderId}={}) {
   if(!UUID.test(user?.id||"")||!UUID.test(orderId||""))throw Error("identity_required");
   const order=await store.order(orderId);
   const right=await store.memberEntitlement(user.id,WB001_SLUG);
   if(!right||right.status!=="active"||right.source!=="stripe_commerce"
     ||right.provider_entitlement_ref!==orderId
     ||!authorizeDirectDownload(order,{userId:user.id,now:clock()}))throw Error("not_owned");
   return delivery.signDownload(order,WB001_DOWNLOAD_SECONDS);
  },
  async downloadGuest({orderId,claim}={}) {
   if(!UUID.test(orderId||""))throw Error("invalid_order");
   const order=await store.order(orderId);
   if(!order||order.buyer_kind!=="guest"||!await verifyGuestClaim(order,claimSecret,claim)
     ||!authorizeDirectDownload(order,{claimNonce:order.claim_nonce,now:clock()}))
      throw Error("not_owned");
   return delivery.signDownload(order,WB001_DOWNLOAD_SECONDS);
  }
 });
}
