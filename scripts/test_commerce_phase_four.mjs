import test from "node:test";import assert from "node:assert/strict";
import {evaluateLiveContext,verifyLivePriceShape,PRODUCTION_RUNTIME_ENABLED} from "../launch-backend-staging/commerce/production-adapter-review.mjs";
import {SKU} from "../launch-backend-staging/commerce/commerce-core.mjs";
import fs from "node:fs";
const m=JSON.parse(fs.readFileSync("launch-backend-staging/commerce/inventory-release-candidate.json","utf8"));
const good={mode:"production_review",projectRef:"plhbvtbvtxfzulsaxuim",supabaseUrl:"https://plhbvtbvtxfzulsaxuim.supabase.co",origin:"https://notbrokenjustburning.com",verifiedAccountId:"acct_1UIHnYGyOSBYVfGl",keyMode:"live",webhookMode:"live",accountVerified:true,founderApproval:true,reviewedEvidence:true,canaryApproved:true,slug:"forge-workbook",inventoryApproved:true};
test("even fully approved simulated context cannot activate runtime",()=>{assert.deepEqual(evaluateLiveContext(good),{reviewEligible:true,checkoutEnabled:false,blockers:[]});assert.equal(PRODUCTION_RUNTIME_ENABLED,false);});
test("reject mixed credentials, wrong account or environment, missing approval and later waves",()=>{for(const change of [{keyMode:"test"},{webhookMode:"test"},{verifiedAccountId:"acct_other"},{projectRef:"abcdefghijklmnopqrst"},{origin:"https://evil.example"},{founderApproval:false},{inventoryApproved:false},{slug:"hawk-complete-toolkit"}])assert.equal(evaluateLiveContext({...good,...change}).reviewEligible,false);});
test("live price shape rejects subscription, test, amount and product substitution",()=>{const p={slug:"forge-workbook",amount:1999,currency:"usd",stripe_price_id:"price_live",stripe_product_id:"prod_live",tax_behavior:"exclusive"};const q={id:p.stripe_price_id,product:p.stripe_product_id,unit_amount:p.amount,currency:p.currency,tax_behavior:p.tax_behavior,livemode:true,active:true,type:"one_time"};assert.equal(verifyLivePriceShape(q,p),true);for(const v of [{type:"recurring"},{livemode:false},{unit_amount:1},{product:"other"},{currency:"eur"},{active:false}])assert.throws(()=>verifyLivePriceShape({...q,...v},p));});
test("manufacturing metadata matches five seeded SKUs, no live approval, customer-only PDF contents",()=>{assert.equal(m.productionActivation,false);assert.equal(m.products.length,5);for(const p of m.products){assert.equal(p.approved,false);assert.equal(p.priceCents,SKU.get(p.slug));assert.match(p.archive.sha256,/^[a-f0-9]{64}$/);assert.equal(p.allowedContents.length,2);assert(p.allowedContents.every(f=>f.filename.endsWith(".pdf")&&/^[a-f0-9]{64}$/.test(f.sha256)));}assert.equal(new Set(m.products.map(p=>p.sku)).size,5);});

test("Wave One v1.3 candidate preserves v1.0 history and keeps every SKU inactive",()=>{
 const n=JSON.parse(fs.readFileSync("launch-backend-staging/commerce/inventory-release-candidate-v1.3.json","utf8"));
 assert.equal(m.catalogVersion,"1.0"); assert.equal(n.catalogVersion,"1.3"); assert.equal(n.productionActivation,false);
 assert.equal(n.products.length,5); assert.equal(new Set(n.products.map(p=>p.sku)).size,5);
 for(const p of n.products){const prior=m.products.find(x=>x.sku===p.sku);assert(prior);assert.equal(p.approved,false);assert.equal(p.priceCents,SKU.get(p.slug));assert.equal(p.priceCents,prior.priceCents);assert.equal(p.slug,prior.slug);assert.equal(p.wave,prior.wave);assert.equal(p.allowedContents.length,2);assert.equal(new Set(p.allowedContents.map(x=>x.filename)).size,2);
 for(const a of [p.archive,...p.allowedContents]){assert(Number.isSafeInteger(a.bytes)&&a.bytes>0);assert.match(a.sha256,/^[a-f0-9]{64}$/);}
 if(p.wave===1){assert.equal(p.version,"1.3");assert.equal(prior.version,"1.0");assert.equal(p.archive.filename,p.sku+"_v1.3_customer.zip");assert.notEqual(p.archive.sha256,prior.archive.sha256);assert(p.allowedContents.every(x=>x.filename.endsWith("_v1.3.pdf")));}else assert.deepEqual(p,prior);
 }
});
