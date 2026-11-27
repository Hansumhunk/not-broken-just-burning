import test from "node:test";
import assert from "node:assert/strict";
import {CATEGORY,recipientEligibility,queueProposal} from "./flame_letter_send_guard.mjs";
const sha="a".repeat(64);
const r={emailVerified:true,newsletterConsent:true,consentAt:"2026-11-20T12:00:00Z",
 providerMarketingEligible:true,marketingBlocklisted:false,unsubscribed:false,
 freeMemberActive:false,plusEntitlementActive:false,ownsProduct:false,
 opaqueRecipientRef:"synthetic-1"};
const m={id:"synthetic-week-1",providerCampaignId:"synthetic-provider-ref",
 contentSha256:sha,category:CATEGORY.newsletter,approved:true};
const p={environment:"production",founderAuthorized:true,scheduleAuthorized:true,
 audienceAuthorized:true,providerConnected:true,queueVerified:true};
const call=(overrides={})=>queueProposal({recipient:r,message:m,policy:p,ledger:[],now:"2026-11-23T12:00:00Z",...overrides});
test("a confirmed newsletter-only synthetic subscriber qualifies for proposal, not delivery",()=>{
 const result=call();assert.equal(result.ready,true);assert.equal(result.reason,"DRY_RUN_ELIGIBLE_NOT_SENT");
 assert.match(result.key,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(result),/synthetic-1/);
});
test("every production gate independently fails closed",()=>{
 for(const key of ["founderAuthorized","scheduleAuthorized","audienceAuthorized","providerConnected","queueVerified"]){
  assert.equal(call({policy:{...p,[key]:false}}).reason,"PRODUCTION_GATES_CLOSED");
 }
 assert.equal(call({policy:{...p,environment:"test"}}).reason,"PRODUCTION_GATES_CLOSED");
});
test("account creation and transactional permission cannot replace newsletter opt-in",()=>{
 assert.equal(recipientEligibility({...r,newsletterConsent:false,freeMemberActive:true},CATEGORY.newsletter),"NO_VERIFIED_MARKETING_CONSENT");
 assert.equal(recipientEligibility({...r,providerMarketingEligible:false},CATEGORY.newsletter),"PROVIDER_ELIGIBILITY_UNVERIFIED");
 assert.equal(recipientEligibility({...r,consentAt:null},CATEGORY.newsletter),"NO_VERIFIED_MARKETING_CONSENT");
});
test("marketing suppression overrides all other status and entitlements",()=>{
 for(const flag of ["marketingBlocklisted","unsubscribed","complained","hardBounced"]){
  assert.equal(call({recipient:{...r,[flag]:true}}).reason,"SUPPRESSED");
 }
});
test("separate member and product entitlements are required for their audiences",()=>{
 assert.equal(recipientEligibility(r,CATEGORY.free),"FREE_MEMBERSHIP_NOT_VERIFIED");
 assert.equal(recipientEligibility(r,CATEGORY.plus),"PAID_ENTITLEMENT_NOT_VERIFIED");
 assert.equal(recipientEligibility(r,CATEGORY.product),"PRODUCT_OWNERSHIP_NOT_VERIFIED");
 assert.equal(recipientEligibility({...r,plusEntitlementActive:true},CATEGORY.plus),"OK");
 assert.equal(recipientEligibility({...r,ownsProduct:true},CATEGORY.product),"OK");
});
test("welcome overlap, minimum spacing, and duplicate queue ledger are held",()=>{
 assert.equal(call({recipient:{...r,welcomeSequenceActive:true}}).reason,"WELCOME_FREQUENCY_HOLD");
 assert.equal(call({recipient:{...r,lastMarketingAt:"2026-11-22T12:00:00Z"}}).reason,"MINIMUM_FREQUENCY_SPACING");
 const first=call();
 assert.equal(call({ledger:[{key:first.key,status:"inflight"}]}).reason,"DUPLICATE_OR_INFLIGHT");
 assert.equal(call({ledger:null}).reason,"LEDGER_UNAVAILABLE");
});
test("unapproved and mismatched messages cannot be queued",()=>{
 assert.equal(call({message:{...m,approved:false}}).reason,"MESSAGE_NOT_APPROVED");
 assert.equal(call({message:{...m,contentSha256:"bad"}}).reason,"MESSAGE_NOT_APPROVED");
 assert.equal(call({message:{...m,category:"transactional"}}).reason,"UNKNOWN_AUDIENCE");
});
