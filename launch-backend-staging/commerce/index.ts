import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import Stripe from "npm:stripe@22.6.2";
import { verifiedStripeEvent } from "./signature.ts";
import { sandboxAllowed, SKU, idOf, validatePrice, verifySession, ownedDownload } from "./commerce-core.mjs";
const env=(k:string)=>Deno.env.get(k)||"";
const url=env("SUPABASE_URL"), key=env("NBJB_COMMERCE_STRIPE_TEST_KEY"), ref=env("NBJB_COMMERCE_SANDBOX_REF");
const origin=env("NBJB_COMMERCE_PREVIEW_ORIGIN").replace(/\/$/,"");
const bucket="nbjb-private-products";
const sandbox=sandboxAllowed({mode:env("NBJB_COMMERCE_MODE"),key,url,expectedRef:ref}) && /^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(origin) && origin!=="https://notbrokenjustburning.com" && origin!=="https://www.notbrokenjustburning.com";
const admin=sandbox?createClient(url,env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}}):null;
const stripe=sandbox?new Stripe(key):null;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safePath=(p:string)=>/^[a-z0-9-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\.(pdf|zip)$/.test(p) && !p.includes("..");
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Vary":"Origin"};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
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
 if(s.metadata?.nbjb_commerce!=="v1"||s.mode!=="payment")return;
 const oid=s.metadata.order_id;
 if(!uuid.test(oid||""))throw Error("invalid_order_id");
 const o=await orderById(oid);
 if(!o)throw Error("order_missing");
 const items=await stripe!.checkout.sessions.listLineItems(s.id,{limit:2});
 const intent=idOf(s.payment_intent);
 const pi=s.payment_status==="paid"&&intent?await stripe!.paymentIntents.retrieve(intent):null;
 const ch=idOf(pi?.latest_charge);const charge=ch?await stripe!.charges.retrieve(ch):null;
 const v=verifySession(s,items,o,pi,charge);
 if(eventType.startsWith("charge.dispute.")&&v.state==="paid")v.state="disputed";
 if(eventType==="checkout.session.async_payment_failed"&&s.status==="complete"&&s.payment_status==="unpaid"&&intent){const failed=await stripe!.paymentIntents.retrieve(intent);if(["canceled","requires_payment_method"].includes(failed.status))v.state="failed";}
 // Failed card attempts can be retried in the same open session. Delayed methods
 // are disabled; if one somehow occurs, keep pending until provider expiry or human reconciliation.
 must(await admin!.rpc("commerce_reconcile",{p_order:o.id,p_event:eventID,p_session:s.id,p_intent:v.intent,p_state:v.state,p_total:v.total,p_refunded:v.refunded}));
}
async function webhook(req:Request) {
 const secret=env("NBJB_COMMERCE_STRIPE_TEST_WEBHOOK_SECRET"), signature=req.headers.get("stripe-signature");
 if(!secret.startsWith("whsec_")||!signature)return json({error:"signature_required"},400);
 let event:Stripe.Event;
 try {event=await verifiedStripeEvent(stripe!,await req.text(),signature,secret);}catch{return json({error:"invalid_signature_or_environment"},400);}
 try{
 const obj:any=event.data.object;
 if(["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","checkout.session.expired"].includes(event.type))await reconcile(obj.id,event.id,event.type);
 else if(["charge.refunded","charge.dispute.created","charge.dispute.updated","charge.dispute.closed","refund.created","refund.updated","refund.failed"].includes(event.type)){
   let pi=idOf(obj.payment_intent);
   if(!pi&&obj.charge){const charge=await stripe!.charges.retrieve(idOf(obj.charge)!);pi=idOf(charge.payment_intent);}
   if(pi){const intent=await stripe!.paymentIntents.retrieve(pi);if(intent.metadata?.nbjb_commerce==="v1"){
     const sessions=await stripe!.checkout.sessions.list({payment_intent:pi,limit:2});
     if(sessions.has_more||sessions.data.length!==1)throw Error("session_lookup_ambiguous");
     await reconcile(sessions.data[0].id,event.id,event.type);
   }}
 }
 return json({received:true});
 }catch{console.error("commerce_webhook_retry");return json({error:"reconciliation_failed"},500);}
}
Deno.serve(async(req:Request)=>{
 if(!sandbox||!admin||!stripe)return json({error:"commerce_disabled"},503);
 if(req.method==="POST" && new URL(req.url).pathname.endsWith("/webhook"))return webhook(req);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST"||req.headers.get("origin")!==origin)return json({error:"not_allowed"},403);
 const user=await verifiedUser(req);if(!user)return json({error:"unauthorized"},401);
 let body:any;try{body=await req.json();}catch{return json({error:"invalid_request"},400);}
 if(!body||typeof body!=="object")return json({error:"invalid_request"},400);
 try{
 if(body.action==="catalog"){
   const products=must(await admin.from("commerce_products").select("slug,amount,currency,terms_version,tax_behavior").eq("active",true));
   return json({products:products.filter((p:any)=>SKU.get(p.slug)===p.amount)});
 }
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
   await productAsset(o);
   const signed=must(await admin.storage.from(bucket).createSignedUrl(o.asset_key,60,{download:o.download_name}));
   // Recheck before releasing bearer URL; no raw keys or identifiers in metrics.
   if(!ownedDownload(await orderById(o.id),await entitlement(user.id,slug),user.id,slug))return json({error:"not_owned"},403);
   must(await admin.rpc("commerce_metric",{p_slug:slug,p_metric:"download_link_issued"}));
   return json({url:signed.signedUrl,expiresIn:60});
 }
 if(body.action!=="checkout")return json({error:"unknown_action"},400);
 if(env("NBJB_COMMERCE_SANDBOX_CHECKOUT")!=="enabled")return json({error:"checkout_disabled"},503);
 const p=must(await admin.from("commerce_products").select("*").eq("slug",slug).eq("active",true).maybeSingle());
 if(!p||body.termsVersion!==p.terms_version||body.acceptTerms!==true)return json({error:"not_available_or_terms_required"},409);
 await productAsset(p);
 const price=await stripe.prices.retrieve(p.stripe_price_id,{expand:["product"]});
 validatePrice(price,p);
 if(typeof price.product==="string"||"deleted" in price.product||!price.product.active||idOf(price.product.tax_code)!==p.tax_code)return json({error:"tax_or_product_mismatch"},503);
 const reserve=await admin.rpc("commerce_reserve",{p_user:user.id,p_slug:slug,p_terms:p.terms_version});
 if(reserve.error){const m=reserve.error.message;return json({error:["already_owned","order_review","not_available"].includes(m)?m:"checkout_unavailable"},409);}
 const o=Array.isArray(reserve.data)?reserve.data[0]:reserve.data;
 if(!o)throw Error('order_not_reserved');
 if(o.stripe_price_id!==p.stripe_price_id||o.amount!==p.amount||o.tax_behavior!==p.tax_behavior)return json({error:"order_review"},409);
 let s:Stripe.Checkout.Session;
 if(o.stripe_session_id)s=await stripe.checkout.sessions.retrieve(o.stripe_session_id);
 else{
 const expires=Math.floor(Date.parse(o.created_at)/1000)+7200;
 // Stripe idempotency retention is at least 24h. Never recreate an old unknown session.
 if(!Number.isFinite(expires)||expires<Math.floor(Date.now()/1000)+1900)return json({error:"order_review"},409);
 const metadata={nbjb_commerce:"v1",order_id:o.id,slug};
 s=await stripe.checkout.sessions.create({mode:"payment",payment_method_types:["card"],line_items:[{price:o.stripe_price_id,quantity:1}],client_reference_id:o.id,metadata,payment_intent_data:{metadata},expires_at:expires,automatic_tax:{enabled:true},customer_creation:"always",success_url:origin+"/commerce-result.html?order="+o.id+"&return=success",cancel_url:origin+"/commerce-result.html?order="+o.id+"&return=cancel"}, {idempotencyKey:"nbjb-commerce-v1-"+o.id});
 // Conditional bind: a webhook may have already bound this order.
 must(await admin.from("commerce_orders").update({stripe_session_id:s.id}).eq("id",o.id).eq("status","pending").is("stripe_session_id",null));
 }
 if(s.metadata?.order_id!==o.id||s.livemode||s.mode!=="payment")throw Error("session_mismatch");
 if(s.status!=="open"||!s.url||!trustedCheckoutUrl(s.url))return json({error:"order_pending",order:o.id},409);
 return json({url:s.url,order:o.id});
 }catch{console.error("commerce_request_failed");return json({error:"commerce_unavailable"},503);}
});
