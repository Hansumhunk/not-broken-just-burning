// ADDITIVE WB-001 adapter for EXISTING commerce-live function.
// This code is source-staged only; WB001_PUBLIC_RELEASE=false and parent runtime lock remain OFF.
// No new Supabase project, merchant, subscription or webhook endpoint.
import {createWB001Service} from "./wb001-operations.mjs";
import {WB001_SLUG,WB001_ASSET_KEY,WB001_DOWNLOAD_SECONDS,WB001_PUBLIC_RELEASE} from "./wb001-core.mjs";

type PortOptions={admin:any,stripe:any,origin:string,env:(name:string)=>string,verifyLiveAccount:()=>Promise<unknown>};
function must(r:any){if(r?.error)throw Error("db_or_storage_failure");return r?.data;}
function idOf(v:any){return typeof v==="string"?v:v?.id||null;}
function safeEmail(value:any){return typeof value==="string"?value.trim().toLowerCase():null;}

export function makeWB001Ports({admin,stripe,origin,env,verifyLiveAccount}:PortOptions){
 if(!WB001_PUBLIC_RELEASE)throw Error("wb001_release_not_authorized");
 if(!admin||!stripe||origin!=="https://notbrokenjustburning.com")throw Error("unapproved_context");
 const bucket="nbjb-private-products";
 const store={
  async product(slug:string){return must(await admin.from("commerce_products").select("*").eq("slug",slug).maybeSingle());},
  async membership(uid:string){return must(await admin.from("membership_entitlements")
    .select("tier,status,source,provider,provider_customer_ref,provider_subscription_ref,valid_from,valid_until")
    .eq("user_id",uid).maybeSingle());},
  async reserve({slug,userId,guestEmail,terms}:any) {
    return must(await admin.rpc("commerce_direct_reserve",
       {p_slug:slug,p_user:userId,p_guest_email:guestEmail,p_terms:terms}));
  },
  async bindSession(orderId:string,sid:string) {
    // A webhook may have arrived first; never overwrite another session id.
    const existing=await this.order(orderId);
    if(existing?.stripe_session_id && existing.stripe_session_id!==sid)throw Error("provider_session_collision");
    if(!existing?.stripe_session_id) {
      must(await admin.from("commerce_direct_orders").update({stripe_session_id:sid,updated_at:new Date().toISOString()})
        .eq("id",orderId).eq("status","pending").is("stripe_session_id",null));
    }
  },
  async order(id:string){return must(await admin.from("commerce_direct_orders").select("*").eq("id",id).maybeSingle());},
  async outbox(id:string){return must(await admin.from("commerce_direct_outbox").select("status,attempts,pending_nonce").eq("order_id",id).maybeSingle());},
  async reconcile(p:any){must(await admin.rpc("commerce_direct_reconcile",{
    p_order:p.order,p_event:p.event,p_session:p.session,p_intent:p.intent,
    p_state:p.state,p_total:p.total,p_refunded:p.refunded,p_email:p.email}));},
  async markReceipt(id:string){must(await admin.rpc("commerce_direct_mark_receipt",{p_order:id}));},
  async requestRecovery(email:string){return must(await admin.rpc("commerce_direct_request_recovery",{p_email:email}));},
  async memberEntitlement(userId:string,slug:string){return must(await admin.from("product_entitlements")
    .select("status,source,provider_entitlement_ref").eq("user_id",userId).eq("product_slug",slug).maybeSingle());}
 };
 const provider={
  async verifyLiveSubscription(m:any) {
    if(!m?.provider_subscription_ref?.startsWith("sub_")||!m?.provider_customer_ref?.startsWith("cus_"))return false;
    await verifyLiveAccount();
    const sub=await stripe.subscriptions.retrieve(m.provider_subscription_ref);
    if(!sub?.livemode||sub.id!==m.provider_subscription_ref||sub.status!=="active"
      ||idOf(sub.customer)!==m.provider_customer_ref)return false;
    const item=sub.items?.data?.[0];
    const providerUntil=Number(item?.current_period_end||sub.current_period_end);
    const entitledUntil=Date.parse(m.valid_until)/1000;
    const now=Math.floor(Date.now()/1000);
    return Number.isFinite(providerUntil)&&providerUntil>now
      && entitledUntil<=providerUntil+300&&entitledUntil>now;
  },
  async price(priceId:string){await verifyLiveAccount();return stripe.prices.retrieve(priceId,{expand:["product"]});},
  async checkoutSession(sid:string){return stripe.checkout.sessions.retrieve(sid);},
  async createCheckout({order,customerEmail,successUrl,cancelUrl,idempotencyKey}:any) {
   await verifyLiveAccount();
   const expires=Math.floor(Date.parse(order.created_at)/1000)+7200;
   if(!Number.isFinite(expires)||expires<Math.floor(Date.now()/1000)+1900)throw Error("order_expired");
   // Customer identity comes from a verified member JWT or server-validated guest email.
   // Under no circumstances take arbitrary Stripe Price IDs or discount amounts from the browser.
   return stripe.checkout.sessions.create({
     mode:"payment",payment_method_types:["card"],line_items:[{price:order.stripe_price_id,quantity:1}],
     customer_email:customerEmail,customer_creation:"always",client_reference_id:order.id,
     metadata:{nbjb_commerce:"wb001-v1-live",order_id:order.id,slug:WB001_SLUG},
     payment_intent_data:{metadata:{nbjb_commerce:"wb001-v1-live",order_id:order.id,slug:WB001_SLUG}},
     automatic_tax:{enabled:true},expires_at:expires,success_url:successUrl,cancel_url:cancelUrl
   },{idempotencyKey});
  },
  async snapshot(sessionId:string) {
   await verifyLiveAccount();
   const session=await stripe.checkout.sessions.retrieve(sessionId);
   const items=await stripe.checkout.sessions.listLineItems(sessionId,{limit:2});
   const piId=idOf(session.payment_intent);
   const paymentIntent=piId?await stripe.paymentIntents.retrieve(piId):null;
   const chargeId=idOf(paymentIntent?.latest_charge);
   const charge=chargeId?await stripe.charges.retrieve(chargeId):null;
   if(charge && charge.livemode){
      // Refunds/disputes must be observed from the source of truth, never just webhook order.
      const refunds=await stripe.refunds.list({charge:charge.id,limit:100});
      const disputes=await stripe.disputes.list({charge:charge.id,limit:100});
      if(refunds.has_more||disputes.has_more)throw Error("provider_snapshot_incomplete");
      const refunded=refunds.data.filter((r:any)=>r.status==="succeeded").reduce((n:number,r:any)=>n+r.amount,0);
      if(!Number.isSafeInteger(refunded)||refunded<0||refunded>charge.amount)throw Error("provider_refund_mismatch");
      charge.amount_refunded=refunded;
      charge.disputed=charge.disputed||disputes.data.some((d:any)=>d.status!=="won");
   }
   return {session,items,paymentIntent,charge};
  }
 };
 const delivery={
  async assertPrivateAsset(p:any) {
   if(p.asset_key!==WB001_ASSET_KEY||p.asset_version!=="v1.0"||p.download_name!=="NBJB-WB-001_v1.0_customer.zip")
     throw Error("asset_not_approved");
   const path=p.asset_key.slice(0,p.asset_key.lastIndexOf("/"));
   const name=p.asset_key.slice(p.asset_key.lastIndexOf("/")+1);
   const files=must(await admin.storage.from(bucket).list(path,{search:name,limit:5}));
   if(!files?.some((f:any)=>f.name===name&&f.id&&Number(f.metadata?.size)>0))throw Error("private_asset_not_ready");
  },
  async signDownload(o:any,seconds:number) {
   await this.assertPrivateAsset(o);
   if(seconds!==WB001_DOWNLOAD_SECONDS)throw Error("unapproved_download_ttl");
   const result=must(await admin.storage.from(bucket).createSignedUrl(o.asset_key,seconds,{download:o.download_name}));
   const u=new URL(result.signedUrl,env("SUPABASE_URL"));
   if(u.origin!==env("SUPABASE_URL")||!u.pathname.startsWith("/storage/v1/object/sign/"+bucket+"/"))
     throw Error("unsafe_signed_url");
   return {url:u.href,expiresIn:seconds};
  },
  async sendGuestReceipt({to,orderId,url}:any){
   const token=env("NBJB_WB001_BREVO_TRANSACTIONAL_KEY");
   const sender=env("NBJB_WB001_VERIFIED_SENDER_EMAIL");
   if(!token.startsWith("xkeysib-")||!sender||!sender.includes("@"))throw Error("transactional_email_not_configured");
   // Transactional delivery is NOT newsletter opt-in. No marketing copy or subscriber import.
   const response=await fetch("https://api.brevo.com/v3/smtp/email",{
    method:"POST",headers:{"api-key":token,"Content-Type":"application/json","accept":"application/json"},
    body:JSON.stringify({sender:{email:sender,name:"Not Broken Just Burning"},
      to:[{email:to}],subject:"Your From Chaos to Clarity workbook download",
      textContent:"Thank you for purchasing From Chaos to Clarity. Your personal download access link is:\n"+url+
       "\n\nIf you did not make this purchase, contact notbrokenjustburning@gmail.com. This is a transactional receipt, not a subscription."})
   });
   if(!response.ok)throw Error("transactional_delivery_pending");
   // Do not log the response, token, email, bearer URL or customer PII.
   void orderId;
  }
 };
 const verifyAbuse=async(token:string)=>{
  const secret=env("NBJB_WB001_TURNSTILE_SECRET");
  if(!secret || typeof token!=="string"||token.length<20)return false;
  const form=new URLSearchParams({secret,response:token});
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
  if(!response.ok)return false;
  const result=await response.json();
  return result.success===true&&result.hostname==="notbrokenjustburning.com";
 };
 return createWB001Service({store,provider,delivery,verifyAbuse,
   claimSecret:env("NBJB_WB001_GUEST_CLAIM_SECRET"),origin});
}

export async function handleWB001Action(body:any,user:any,options:PortOptions){
 if(!WB001_PUBLIC_RELEASE)return {error:"wb001_checkout_disabled",status:503};
 const svc=makeWB001Ports(options);
 try{
  switch(body?.action){
   case "wb001_guest_checkout":return {data:await svc.checkout({
    guestEmail:body.guestEmail,abuseProof:body.turnstileToken,acceptedTerms:body.acceptTerms===true,termsVersion:body.termsVersion})};
   case "wb001_member_checkout":return {data:await svc.checkout({
    user,acceptedTerms:body.acceptTerms===true,termsVersion:body.termsVersion})};
   case "wb001_guest_download":return {data:await svc.downloadGuest({orderId:body.order,claim:body.claim})};
   case "wb001_guest_recover":return {data:await svc.recoverGuest({guestEmail:body.guestEmail,abuseProof:body.turnstileToken})};
   case "wb001_member_download":return {data:await svc.downloadMember({user,orderId:body.order})};
   default:return {error:"unknown_action",status:400};
  }
 }catch(e){
  const msg=e instanceof Error?e.message:"commerce_unavailable";
  if(["invalid_email","abuse_proof_required","terms_required","identity_required","unverified_account"].includes(msg))
    return {error:msg,status:400};
  if(["not_owned"].includes(msg))return {error:msg,status:403};
  if(["order_snapshot_mismatch","order_not_pending","order_expired","order_review","already_owned"].includes(msg))
    return {error:"order_needs_review",status:409};
  // No customer data, amount or secret in public errors.
  return {error:"commerce_unavailable",status:503};
 }
}

export async function handleWB001VerifiedWebhook(sessionId:string,eventId:string,options:PortOptions){
 if(!WB001_PUBLIC_RELEASE)throw Error("wb001_checkout_disabled");
 return makeWB001Ports(options).reconcileVerifiedSession(sessionId,eventId);
}
