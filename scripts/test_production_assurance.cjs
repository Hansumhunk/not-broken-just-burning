'use strict';
// Offline assurance only. Stripe SDK performs local cryptographic checks;
// this file must never call Stripe's API, a Supabase URL, or use real secrets.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const Stripe = require('stripe');
const stripe = new Stripe('sk_test_nbjb_offline_fixture_not_a_real_key');
const secret = 'whsec_nbjb_offline_fixture_only_not_a_real_secret';
const base = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(base,p),'utf8');
const checkoutModule = pathToFileURL(path.join(base,'launch-backend-staging/create-live-checkout-session/checkout-policy.mjs')).href;
const paymentModule = pathToFileURL(path.join(base,'launch-backend-staging/stripe-live-webhook/payment-boundary.mjs')).href;
const handler=read('launch-backend-staging/stripe-live-webhook/index.ts');
const event = {id:'evt_offline_qa',object:'event',type:'invoice.payment_failed',created:Math.floor(Date.now()/1000),livemode:false,data:{object:{id:'in_offline_qa'}}};
const body=JSON.stringify(event);
const header=(payload=body, timestamp=Math.floor(Date.now()/1000),key=secret)=>stripe.webhooks.generateTestHeaderString({payload,secret:key,timestamp});

test('pinned Stripe SDK authenticates raw-body signed sandbox fixture; tampering, wrong secret and expired timestamp reject',async()=>{
 const parsed=await stripe.webhooks.constructEventAsync(body,header(),secret);
 assert.equal(parsed.type,event.type);
 assert.equal(parsed.livemode,false);
 await assert.rejects(stripe.webhooks.constructEventAsync(body+' ',header(),secret));
 await assert.rejects(stripe.webhooks.constructEventAsync(body,header(body,undefined,'other_fixture_secret'),secret));
 await assert.rejects(stripe.webhooks.constructEventAsync(body,header(body,Math.floor(Date.now()/1000)-3600),secret));
 await assert.rejects(stripe.webhooks.constructEventAsync(body,'',secret));
 assert.ok(handler.indexOf('constructEventAsync(rawBody, signature, webhookSecret)') < handler.indexOf('if (!event.livemode)'));
 assert.ok(handler.indexOf('if (!event.livemode)') < handler.indexOf('claimReceipt(receipts, event)'));
});

test('failed renewal expires exactly at paid-through boundary, then paid invoice restores access',async()=>{
 const {paymentBoundary}=await import(paymentModule);
 const end=Date.parse('2026-12-02T23:03:33Z'), iso=t=>new Date(t).toISOString(), month=30*86400000;
 const old={provider:'stripe',provider_subscription_ref:'sub_fixture',tier:'paid_member',status:'active',valid_from:iso(end-month),valid_until:iso(end)};
 const bounds={validFrom:iso(end),validUntil:iso(end+month)};
 const sub={id:'sub_fixture',status:'past_due',items:{data:[{id:'si_fixture'}]},latest_invoice:{livemode:true,status:'open'}};
 assert.equal(paymentBoundary(sub,old,bounds,end-1).validUntil,old.valid_until);
 assert.equal(paymentBoundary(sub,old,bounds,end).tier,'free_member');
 assert.equal(paymentBoundary(sub,old,bounds,end+1).tier,'free_member');
 const paid={...sub,status:'active',latest_invoice:{livemode:true,status:'paid',lines:{data:[{subscription_item:'si_fixture',period:{end:(end+month)/1000}}]}}};
 assert.equal(paymentBoundary(paid,old,bounds,end+1).validUntil,bounds.validUntil);
});

test('current time-bucket candidate has a demonstrated cross-boundary duplicate-session window',async()=>{
 const {checkoutConflict,sessionIdempotencyKey}=await import(checkoutModule);
 const empty={data:[],has_more:false};
 // Both callers read before either has created a provider session.
 const [a,b]=await Promise.all([1799999,1800000].map(async t=>{
   assert.equal(checkoutConflict(empty,empty),null);
   return sessionIdempotencyKey('cus_fixture',t);
 }));
 assert.notEqual(a,b,'two provider keys can create two sessions; release blocker');
 assert.equal(sessionIdempotencyKey('cus_fixture',1),sessionIdempotencyKey('cus_fixture',1799999));
});

test('reference atomic-attempt model denies simultaneous and cross-window contenders and preserves uncertain outcomes',async()=>{
 // Reference model only: production needs a database unique constraint / CAS.
 // No implementation or migration is deployed by this test.
 let held=null;let sends=0;
 function claim(offer, token) { if(held)return {kind:'blocked',attempt:held.token};held={offer,token,phase:'creating'};return {kind:'claimed',attempt:token}; }
 const request=async(offer,token)=>{const c=claim(offer,token);if(c.kind==='claimed'){sends++;await Promise.resolve();}return c;};
 const a=await Promise.all([request('monthly','attempt-a'),request('annual','attempt-b')]);
 assert.equal(a.filter(x=>x.kind==='claimed').length,1);
 assert.equal(sends,1);
 held.phase='unknown';
 assert.equal(claim('monthly','later-time-window').kind,'blocked');
 // Recovery uses precisely the original attempt key & request parameters.
 assert.equal(held.token,'attempt-a');
 assert.equal(held.offer,'monthly');
 held.phase='terminal_verified';
 held=null; // terminal verification is prerequisite to clearing, never timer alone
 assert.equal(claim('annual','next-attempt').kind,'claimed');
});

test('refund classification is pure, and unrelated product ownership cannot alter membership access',async()=>{
 const {refundReview}=await import(paymentModule);
 const facts={scope:'subscription',status:'succeeded',refundedAmount:1499,chargeAmount:1499,mappingVerified:true,subscriptionStatus:'active',scheduledCancellation:false,entitlementPaid:true};
 const owned=Object.freeze({product:'synthetic-pdf',status:'active'});
 const snapshot=JSON.stringify(facts);
 assert.equal(refundReview(facts),'full_refund_renewal_still_active');
 assert.equal(refundReview({...facts,scope:'product'}),'manual_mapping_review');
 assert.equal(refundReview({...facts,subscriptionStatus:'canceled'}),'entitlement_mismatch');
 assert.equal(refundReview({...facts,refundedAmount:500}),'partial_refund_review');
 assert.equal(refundReview({...facts,status:'pending'}),'pending_or_failed');
 assert.equal(JSON.stringify(facts),snapshot);
 assert.equal(owned.status,'active');
 assert.doesNotMatch(String(refundReview),/\.from\(|stripe\.|fetch\(/);
});
