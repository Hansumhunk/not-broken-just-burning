// Pure validation used by runtime and fixture tests. No secrets, network or DB.
export const LIVE_CHECKOUT_ENABLED = false;
export const PRODUCTION_REF = 'plhbvtbvtxfzulsaxuim';
export const SKU = new Map([['boundary-builder-workbook',1499],['forge-workbook',1999],['30-days-through-the-fire',2499],['masculine-restoration-guide',2999],['hawk-complete-toolkit',4999]]);
export function sandboxAllowed({mode,key,url,expectedRef}) {
 return mode==='sandbox' && /^sk_test_|^rk_test_/.test(key||'') && /^[a-z0-9]{20}$/.test(expectedRef||'') && expectedRef!==PRODUCTION_REF && url==='https://'+expectedRef+'.supabase.co';
}
export function idOf(x){return typeof x==='string'?x:x?.id||null;}
export function validatePrice(price,p) {
 if (!price || price.livemode!==false || !price.active || price.type!=='one_time' || price.currency!==p.currency || price.unit_amount!==p.amount || price.id!==p.stripe_price_id || idOf(price.product)!==p.stripe_product_id || price.tax_behavior!==p.tax_behavior || SKU.get(p.slug)!==p.amount) throw Error('price_mismatch');
}
export function verifySession(s,items,o,pi,charge) {
 if(s.livemode!==false || s.mode!=='payment' || s.metadata?.nbjb_commerce!=='v1' || s.metadata?.order_id!==o.id || s.client_reference_id!==o.id || s.metadata?.slug!==o.slug || (o.stripe_session_id && s.id!==o.stripe_session_id) || s.currency!==o.currency || items.has_more || items.data.length!==1) throw Error('session_mismatch');
 const line=items.data[0];
 if(idOf(line.price)!==o.stripe_price_id || line.quantity!==1 || line.amount_subtotal!==o.amount || s.amount_subtotal!==o.amount || s.amount_total<o.amount || s.total_details?.amount_discount>0) throw Error('line_mismatch');
 if(s.status==='expired' && s.payment_status==='unpaid') return {state:'expired',total:s.amount_total,refunded:0,intent:idOf(s.payment_intent)};
 if(s.payment_status!=='paid') return {state:'pending',total:s.amount_total,refunded:0,intent:idOf(s.payment_intent)};
 if(!pi || pi.livemode!==false || pi.id!==idOf(s.payment_intent) || pi.metadata?.order_id!==o.id || pi.metadata?.nbjb_commerce!=='v1' || pi.status!=='succeeded' || pi.currency!==o.currency || pi.amount_received!==s.amount_total || !charge || charge.livemode!==false || idOf(charge.payment_intent)!==pi.id || !charge.paid || charge.amount!==pi.amount_received || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded<0 || charge.amount_refunded>charge.amount) throw Error('payment_mismatch');
 return {state:charge.amount_refunded===charge.amount?'refunded':charge.disputed?'disputed':'paid',total:pi.amount_received,refunded:charge.amount_refunded,intent:pi.id};
}
export function ownedDownload(o,e,user,slug,now=Date.now()) {
 return !!(o && e && o.status==='paid' && o.user_id===user && o.slug===slug && e.user_id===user && e.product_slug===slug && e.status==='active' && e.source==='stripe_commerce' && e.provider_entitlement_ref===o.id && (!e.valid_until || Date.parse(e.valid_until)>now));
}
