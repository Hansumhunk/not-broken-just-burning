/**
 * Pure offline proposal gate for an eventual provider-connected scheduler.
 * NEVER invokes Brevo or any network. It cannot authorize production on its own.
 * A production adapter must recheck authoritative Brevo suppression immediately before send.
 */
import crypto from "node:crypto";
const SHA=/^[a-f0-9]{64}$/;
export const CATEGORY=Object.freeze({
  newsletter:"general-flame-letter",
  free:"free-flamewalker",
  plus:"flamewalker-plus",
  product:"product-marketing"
});
const validDate=s=>typeof s==="string"&&Number.isFinite(Date.parse(s));
export function recipientEligibility(recipient,category){
 if(!recipient||typeof recipient!=="object")return "MISSING_RECIPIENT";
 if(!recipient.emailVerified||!recipient.newsletterConsent||!validDate(recipient.consentAt))return "NO_VERIFIED_MARKETING_CONSENT";
 if(recipient.unsubscribed||recipient.marketingBlocklisted||recipient.complained||recipient.hardBounced)
   return "SUPPRESSED";
 if(recipient.providerMarketingEligible!==true)return "PROVIDER_ELIGIBILITY_UNVERIFIED";
 if(category===CATEGORY.newsletter)return "OK";
 if(category===CATEGORY.free)return recipient.freeMemberActive===true?"OK":"FREE_MEMBERSHIP_NOT_VERIFIED";
 if(category===CATEGORY.plus)return recipient.plusEntitlementActive===true?"OK":"PAID_ENTITLEMENT_NOT_VERIFIED";
 if(category===CATEGORY.product)return recipient.ownsProduct===true?"OK":"PRODUCT_OWNERSHIP_NOT_VERIFIED";
 return "UNKNOWN_AUDIENCE";
}
export function queueProposal({recipient,message,policy,ledger,now}){
 const denied=reason=>({ready:false,reason});
 const allGates=policy?.environment==="production"&&policy?.founderAuthorized===true
   &&policy?.scheduleAuthorized===true&&policy?.audienceAuthorized===true
   &&policy?.providerConnected===true&&policy?.queueVerified===true;
 if(!allGates)return denied("PRODUCTION_GATES_CLOSED");
 if(message?.approved!==true||!SHA.test(message?.contentSha256||"")||!message?.providerCampaignId)
   return denied("MESSAGE_NOT_APPROVED");
 if(message.category!==CATEGORY.newsletter&&message.category!==CATEGORY.free
   &&message.category!==CATEGORY.plus&&message.category!==CATEGORY.product)
   return denied("UNKNOWN_AUDIENCE");
 const elig=recipientEligibility(recipient,message.category);
 if(elig!=="OK")return denied(elig);
 if(message.category===CATEGORY.newsletter&&recipient.welcomeSequenceActive===true)
   return denied("WELCOME_FREQUENCY_HOLD");
 if(!validDate(now))return denied("INVALID_NOW");
 if(validDate(recipient.lastMarketingAt)&&Date.parse(now)-Date.parse(recipient.lastMarketingAt)<48*3600*1000)
   return denied("MINIMUM_FREQUENCY_SPACING");
 if(!recipient.opaqueRecipientRef||!message.id)return denied("IDEMPOTENCY_IDENTIFIERS_MISSING");
 const key=crypto.createHash("sha256")
   .update([message.id,message.contentSha256,String(recipient.opaqueRecipientRef)].join("|")).digest("hex");
 if(!Array.isArray(ledger))return denied("LEDGER_UNAVAILABLE");
 if(ledger.some(x=>x?.key===key))return denied("DUPLICATE_OR_INFLIGHT");
 // Advisory only. An actual sender requires an atomic UNIQUE constraint or provider idempotency layer.
 return {ready:true,reason:"DRY_RUN_ELIGIBLE_NOT_SENT",key};
}
