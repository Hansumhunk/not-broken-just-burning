// REVIEW ONLY. Not imported by the QA worker, no network, no served route.
// This is an executable preflight model for a later separately reviewed live adapter.
import {SKU,PRODUCTION_REF,idOf} from "./commerce-core.mjs";
export const PRODUCTION_RUNTIME_ENABLED=false;
const wave=new Set(["boundary-builder-workbook","forge-workbook"]);
export function evaluateLiveContext(c){
 const blockers=[];
 if(c?.mode!=="production_review")blockers.push("mode");
 if(c?.projectRef!==PRODUCTION_REF||c?.supabaseUrl!=="https://"+PRODUCTION_REF+".supabase.co")blockers.push("project");
 if(c?.origin!=="https://notbrokenjustburning.com")blockers.push("origin");
 if(c?.verifiedAccountId!=="acct_1UIHnYGyOSBYVfGl")blockers.push("stripe_account");
 if(c?.keyMode!=="live"||c?.webhookMode!=="live"||c?.accountVerified!==true)blockers.push("provider_environment");
 if(c?.founderApproval!==true||c?.reviewedEvidence!==true||c?.canaryApproved!==true)blockers.push("approvals");
 if(!wave.has(c?.slug)||c?.inventoryApproved!==true)blockers.push("product");
 return Object.freeze({reviewEligible:blockers.length===0,checkoutEnabled:PRODUCTION_RUNTIME_ENABLED,blockers});
}
// Exact live price shape, not an actual checkout invocation. No test/live interchange.
export function verifyLivePriceShape(price,p){
 if(!wave.has(p?.slug)||SKU.get(p.slug)!==p.amount||p.currency!=="usd"||price?.livemode!==true||price.active!==true||price.type!=="one_time"||price.currency!==p.currency||price.unit_amount!==p.amount||price.id!==p.stripe_price_id||idOf(price.product)!==p.stripe_product_id||price.tax_behavior!==p.tax_behavior)throw Error("production_price_mismatch");
 return true;
}
