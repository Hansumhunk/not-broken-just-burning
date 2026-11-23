import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import Stripe from "npm:stripe@22.6.2";
import { verifiedStripeEvent } from "./signature.ts";
import { providerSnapshot, verifyLiveAccount } from "./provider.ts";
import { productionAllowed, SKU, idOf, validatePrice, verifySession, ownedDownload } from "./commerce-core.mjs";
import { handleWB001Action,handleWB001VerifiedWebhook } from "./wb001-edge.ts";
const env=(k:string)=>Deno.env.get(k)||"";
const url=env("SUPABASE_URL"), key=env("NBJB_COMMERCE_STRIPE_LIVE_KEY"), ref=env("NBJB_COMMERCE_PRODUCTION_REF");
const origin=env("NBJB_COMMERCE_LIVE_ORIGIN").replace(/\/$/,"");
const bucket="nbjb-private-products";
const live=productionAllowed({mode:env("NBJB_COMMERCE_MODE"),key,url,expectedRef:ref,origin,account:env("NBJB_COMMERCE_LIVE_STRIPE_ACCOUNT")});
const admin=live?createClient(url,env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}}):null;
const stripe=live?new Stripe(key):null;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safePath=(p:string)=>/^[a-z0-9-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\.(pdf|zip)$/.test(p) && !p.includes("..");
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Vary":"Origin"};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
const wb001Ports=()=>({admin,stripe,origin,env,verifyLiveAccount:()=>verifyLiveAccount(stripe!,env("NBJB_COMMERCE_LIVE_STRIPE_ACCOUNT"))});
function must(result:{data:any,error:unknown}):any{if(result.error)throw Error("database_or_storage_error");return result.data;}
function trustedCheckoutUrl(s:string){const u=new URL(s);return u.protocol==="https:" && u.hostname==="checkout.stripe.com";}
async function verifiedUser(req:Request) {
 const token=req.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token||!admin)return null;
 const {data,error}=await admin.auth.getUser(token);
 return error||!data.user||data.user.is_anonymous?null:data.user;
}
async function productAsset(p:any) {
 if(!safePath(p.asset_key)||!p.asset_key.startsWith(p.slug+"/"+p.asset_version+"/")||!(/^[a-zA-Z0-9._-]+\.(pdf|zip)$/.test(p.download_name))||p.download_name.includes(".."))throw Error("asset_not_ready");
 const split=p.asset_key.lastIndexOf("/");
 const folder=p.asset_key.slice(0,split),name=p.asset_key.slice(split+1);
 const files=must(await admin!.storage.from(bucket).list(folder,{search:name,limit:100}));
 if(!files?.some((f:any)=>f.name===name&&f.id&&Number(f.metadata?.size)>0))throw Error("asset_not_ready");
}
async function orderById(id:string){return must(await admin!.from("commerce_orders").select("*").eq("id",id).maybeSingle());}
async function entitlement(user:string,slug:string){return must(await admin!.from("product_entitlements").select("user_id,product_slug,status,source,provider_entitlement_ref,valid_until").eq("user_id",user).eq("product_slug",slug).maybeSingle());}
async function reconcile(sid:string,eventID:string,eventType:string) {
 const s=await stripe!.checkout.sessions.retrieve(sid);
 if(s.metadata?.nbjb_commerce!=="v1-live"||s.mode!=="payment")return;
 const oid=s.metadata.order_id;
 if(!uuid.test(oid||""))throw Error("invalid_order_id");
 const o=await orderById(oid);
 if(!o)throw Error("order_missing");
 const extra=!!(o.stripe_session_id&&o.stripe_session_id!==s.id);
 const {v,pendingRefund,won,refundRecords}=await providerSnapshot(stripe!,s.id,extra?{...o,stripe_session_id:null}:o);
 if(extra){
   // A verified additional charge must never overwrite canonical ownership.
   if(["paid","refunded","disputed"].includes(v.state))must(await admin!.rpc("commerce_record_exception",{p_order:o.id,p_session:s.id,p_intent:v.intent,p_gross:v.total,p_refunded:v.refunded,p_state:v.state,p_pending:pendingRefund}));
   return;
 }
 const intent=idOf(s.payment_intent);
 if(eventType.startsWith("charge.dispute.")&&v.state==="paid"&&!won)v.state="disputed";
 if(eventType==="checkout.session.async_payment_failed"&&s.status==="complete"&&s.payment_status==="unpaid"&&intent){const failed=await stripe!.paymentIntents.retrieve(intent);if(["canceled","requires_payment_method"].includes(failed.status))v.state="failed";}
 // Failed card attempts can be retried in the same open session. Delayed methods
 // are disabled; if one somehow occurs, keep pending until provider expiry or human reconciliation.
 must(await admin!.rpc("commerce_reconcile",{p_order:o.id,p_event:eventID,p_session:s.id,p_intent:v.intent,p_state:v.state,p_total:v.total,p_refunded:v.refunded}));
 if(refundRecords.length&&v.intent)must(await admin!.rpc("commerce_record_refunds",{p_order:o.id,p_session:s.id,p_intent:v.intent,p_data:refundRecords}));
 if(pendingRefund)must(await admin!.from("commerce_orders").update({review_required:true,updated_at:new Date().toISOString()}).eq("id",o.id));
}
async function webhook(req:Request) {
 const secret=env("NBJB_COMMERCE_STRIPE_LIVE_WEBHOOK_SECRET"), signature=req.headers.get("stripe-signature");
 if(!secret.startsWith("whsec_")||!signature)return json({error:"signature_required"},400);
 let event:Stripe.Event;
 try {event=await verifiedStripeEvent(stripe!,await req.text(),signature,secret);}catch{return json({error:"invalid_signature_or_environment"},400);}
 try{
 await verifyLiveAccount(stripe!,env("NBJB_COMMERCE_LIVE_STRIPE_ACCOUNT"));
 const obj:any=event.data.object;
 if(["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","checkout.session.expired"].includes(event.type)){
   if(obj.metadata?.nbjb_commerce==="wb001-v1-live")await handleWB001VerifiedWebhook(obj.id,event.id,wb001Ports());
   else await reconcile(obj.id,event.id,event.type);
 }
 else if(["charge.refunded","charge.dispute.created","charge.dispute.updated","charge.dispute.closed","refund.created","refund.updated","refund.failed"].includes(event.type)){
   let pi=idOf(obj.payment_intent);
   if(!pi&&obj.charge){const charge=await stripe!.charges.retrieve(idOf(obj.charge)!);pi=idOf(charge.payment_intent);}
   if(pi){const intent=await stripe!.paymentIntents.retrieve(pi);if(intent.metadata?.nbjb_commerce==="wb001-v1-live"){
       const sessions=await stripe!.checkout.sessions.list({payment_intent:pi,limit:2});
       if(sessions.has_more||sessions.data.length!==1)throw Error("session_lookup_ambiguous");
       await handleWB001VerifiedWebhook(sessions.data[0].id,event.id,wb001Ports());
     }else if(intent.metadata?.nbjb_commerce==="v1-live"){
     const sessions=await stripe!.checkout.sessions.list({payment_intent:pi,limit:2});
     if(sessions.has_more||sessions.data.length!==1)throw Error("session_lookup_ambiguous");
     await reconcile(sessions.data[0].id,event.id,event.type);
   }}
 }
 return json({received:true});
 }catch{console.error("commerce_webhook_retry");return json({error:"reconciliation_failed"},500);}
}
Deno.serve(async(req:Request)=>{
 if(!live||!admin||!stripe)return json({error:"commerce_disabled"},503);
 if(req.method==="POST" && new URL(req.url).pathname.endsWith("/webhook"))return webhook(req);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST"||req.headers.get("origin")!==origin)return json({error:"not_allowed"},403);
 // Public catalog exposes only SKU, USD price, tax behavior and terms version.
 // Every account, checkout, order-status and asset action remains JWT authenticated.
 let body:any;try{body=await req.json();}catch{return json({error:"invalid_request"},400);}
 if(!body||typeof body!=="object")return json({error:"invalid_request"},400);
 try{
 if(body.action==="catalog"){
   const products=must(await admin.from("commerce_products").select("slug,amount,currency,terms_version,tax_behavior").eq("active",true));
   return json({products:products.filter((p:any)=>SKU.get(p.slug)===p.amount)});
 }
 if(typeof body.action==="string"&&body.action.startsWith("wb001_")){
   const user=await verifiedUser(req);
   const result=await handleWB001Action(body,user,wb001Ports());
   if(result.error)return json({error:result.error},result.status||503);
   return json(result.data);
 }
 const user=await verifiedUser(req);if(!user)return json({error:"unauthorized"},401);
 if(body.action==="status"){
   if(!uuid.test(body.order||""))return json({error:"invalid_order"},400);
   const o=await orderById(body.order);
   if(!o||o.user_id!==user.id)return json({error:"not_found"},404);
   // Never allow a redirect to grant an entitlement; only read the ledger.
   const e=await entitlement(user.id,o.slug);
   return json({status:o.status,owned:ownedDownload(o,e,user.id,o.slug),review:o.review_required});
 }
 const slug=body.slug;
 if(typeof slug!=="string"||!SKU.has(slug))return json({error:"unknown_product"},400);
 if(body.action==="view"){
   must(await admin.rpc("commerce_metric",{p_slug:slug,p_metric:"product_view"}));return json({ok:true});
 }
 if(body.action==="download"){
   const e=await entitlement(user.id,slug);
   if(!e?.provider_entitlement_ref||!uuid.test(e.provider_entitlement_ref))return json({error:"not_owned"},403);
   const o=await orderById(e.provider_entitlement_ref);
   if(!ownedDownload(o,e,user.id,slug))return json({error:"not_owned"},403);
   const resolved=must(await admin.rpc("commerce_resolve_asset",{p_slug:slug,p_version:o.asset_version,p_key:o.asset_key,p_name:o.download_name}));
   if(!Array.isArray(resolved)||resolved.length!==1)throw Error("asset_resolution_failed");
   const asset={...o,...resolved[0]};
   let signed;
   try {await productAsset(asset); signed=must(await admin.storage.from(bucket).createSignedUrl(asset.asset_key,60,{download:asset.download_name}));}
   catch {console.error("commerce_delivery_retry");return json({error:"download_unavailable",retryable:true},503);}
   // Recheck before releasing bearer URL; no raw keys or identifiers in metrics.
   if(!ownedDownload(await orderById(o.id),await entitlement(user.id,slug),user.id,slug))return json({error:"not_owned"},403);
   must(await admin.rpc("commerce_metric",{p_slug:slug,p_metric:"download_link_issued"}));
   return json({url:signed.signedUrl,expiresIn:60});
 }
 if(body.action!=="checkout")return json({error:"unknown_action"},400);
 if(env("NBJB_COMMERCE_LIVE_CHECKOUT")!=="enabled")return json({error:"checkout_disabled"},503);
 await verifyLiveAccount(stripe,env("NBJB_COMMERCE_LIVE_STRIPE_ACCOUNT"));
 const p=must(await admin.from("commerce_products").select("*").eq("slug",slug).eq("active",true).maybeSingle());
 if(!p||body.termsVersion!==p.terms_version||body.acceptTerms!==true)return json({error:"not_available_or_terms_required"},409);
 await productAsset(p);
 const price=await stripe.prices.retrieve(p.stripe_price_id,{expand:["product"]});
 validatePrice(price,p);
 if(typeof price.product==="string"||"deleted" in price.product||!price.product.active||idOf(price.product.tax_code)!==p.tax_code)return json({error:"tax_or_product_mismatch"},503);
 const reserve=await admin.rpc("commerce_reserve",{p_user:user.id,p_slug:slug,p_terms:p.terms_version});
 if(reserve.error){const m=reserve.error.message;return json({error:["already_owned","order_review","not_available","account_review","payment_exception_review"].includes(m)?m:"checkout_unavailable"},409);}
 const o=Array.isArray(reserve.data)?reserve.data[0]:reserve.data;
 if(!o)throw Error('order_not_reserved');
 if(o.stripe_price_id!==p.stripe_price_id||o.amount!==p.amount||o.tax_behavior!==p.tax_behavior)return json({error:"order_review"},409);
 let s:Stripe.Checkout.Session;
 if(o.stripe_session_id)s=await stripe.checkout.sessions.retrieve(o.stripe_session_id);
 else{
 const expires=Math.floor(Date.parse(o.created_at)/1000)+7200;
 // Stripe idempotency retention is at least 24h. Never recreate an old unknown session.
 if(!Number.isFinite(expires)||expires<Math.floor(Date.now()/1000)+1900)return json({error:"order_review"},409);
 const metadata={nbjb_commerce:"v1-live",order_id:o.id,slug};
 s=await stripe.checkout.sessions.create({mode:"payment",payment_method_types:["card"],line_items:[{price:o.stripe_price_id,quantity:1}],client_reference_id:o.id,metadata,payment_intent_data:{metadata},expires_at:expires,automatic_tax:{enabled:true},customer_creation:"always",success_url:origin+"/commerce-result.html?order="+o.id+"&return=success",cancel_url:origin+"/commerce-result.html?order="+o.id+"&return=cancel"}, {idempotencyKey:"nbjb-commerce-live-v1-"+o.id});
 // Conditional bind: a webhook may have already bound this order.
 must(await admin.from("commerce_orders").update({stripe_session_id:s.id}).eq("id",o.id).eq("status","pending").is("stripe_session_id",null));
 }
 if(s.metadata?.order_id!==o.id||!s.livemode||s.mode!=="payment")throw Error("session_mismatch");
 if(s.status!=="open"||!s.url||!trustedCheckoutUrl(s.url))return json({error:"order_pending",order:o.id},409);
 return json({url:s.url,order:o.id});
 }catch{console.error("commerce_request_failed");return json({error:"commerce_unavailable"},503);}
});
