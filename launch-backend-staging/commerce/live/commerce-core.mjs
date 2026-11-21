// Pure validation used by runtime and fixture tests. No secrets, network or DB.
// Hardened standalone live adapter: independent production review required before enabling.
// Changing an environment variable cannot override this compile-time release lock.
export const LIVE_RUNTIME_REVIEWED = false;
export const VERIFIED_LIVE_ACCOUNT = "acct_1UIHnYGyOSBYVfGl";
export const LIVE_ORIGIN = "https://notbrokenjustburning.com";
export const WAVE_ONE = new Set(["boundary-builder-workbook","forge-workbook"]);
export const PRODUCTION_REF = 'plhbvtbvtxfzulsaxuim';
export const SKU = new Map([['boundary-builder-workbook',1499],['forge-workbook',1999],['30-days-through-the-fire',2499],['masculine-restoration-guide',2999],['hawk-complete-toolkit',4999]]);
export function liveConfigurationMatches({mode,key,url,expectedRef,origin,account}) {
 return mode==="production" && /^(sk_live_|rk_live_)/.test(key||"")
   && expectedRef===PRODUCTION_REF && url==="https://"+PRODUCTION_REF+".supabase.co"
   && origin===LIVE_ORIGIN && account===VERIFIED_LIVE_ACCOUNT;
}
export function productionAllowed(context) {
 return LIVE_RUNTIME_REVIEWED && liveConfigurationMatches(context);
}
export function idOf(x){return typeof x==='string'?x:x?.id||null;}
export function validatePrice(price,p) {
 if (!price || price.livemode!==true || !price.active || price.type!=='one_time' || price.currency!==p.currency || price.unit_amount!==p.amount || price.id!==p.stripe_price_id || idOf(price.product)!==p.stripe_product_id || price.tax_behavior!==p.tax_behavior || (!WAVE_ONE.has(p.slug) || SKU.get(p.slug)!==p.amount)) throw Error('price_mismatch');
}
export function verifySession(s,items,o,pi,charge) {
 if(s.livemode!==true || s.mode!=='payment' || s.metadata?.nbjb_commerce!=='v1-live' || s.metadata?.order_id!==o.id || s.client_reference_id!==o.id || s.metadata?.slug!==o.slug || (o.stripe_session_id && s.id!==o.stripe_session_id) || s.currency!==o.currency || items.has_more || items.data.length!==1) throw Error('session_mismatch');
 const line=items.data[0];
 if(idOf(line.price)!==o.stripe_price_id || line.quantity!==1 || line.amount_subtotal!==o.amount || s.amount_subtotal!==o.amount || s.amount_total<o.amount || s.total_details?.amount_discount>0) throw Error('line_mismatch');
 if(s.status==='expired' && s.payment_status==='unpaid') return {state:'expired',total:s.amount_total,refunded:0,intent:idOf(s.payment_intent)};
 if(s.payment_status!=='paid') return {state:'pending',total:s.amount_total,refunded:0,intent:idOf(s.payment_intent)};
 if(!pi || pi.livemode!==true || pi.id!==idOf(s.payment_intent) || pi.metadata?.order_id!==o.id || pi.metadata?.nbjb_commerce!=='v1-live' || pi.status!=='succeeded' || pi.currency!==o.currency || pi.amount_received!==s.amount_total || !charge || charge.livemode!==true || idOf(charge.payment_intent)!==pi.id || !charge.paid || charge.amount!==pi.amount_received || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded<0 || charge.amount_refunded>charge.amount) throw Error('payment_mismatch');
 return {state:charge.amount_refunded===charge.amount?'refunded':charge.disputed?'disputed':'paid',total:pi.amount_received,refunded:charge.amount_refunded,intent:pi.id};
}
export function ownedDownload(o,e,user,slug,now=Date.now()) {
 return !!(o && e && o.status==='paid' && o.user_id===user && o.slug===slug && e.user_id===user && e.product_slug===slug && e.status==='active' && e.source==='stripe_commerce' && e.provider_entitlement_ref===o.id && (!e.valid_until || Date.parse(e.valid_until)>now));
}
