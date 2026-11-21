// Preflight for checkout-DISABLED commerce staging review only.
// This does not mutate Stripe, Supabase, GitHub, or storefront and never permits a charge.
// Sandbox browser QA is intentionally SKIPPED, not represented as passed.
const fs=require('node:fs');
const REQUIRED=['founderStageApproval','productionSchemaAndBackupReviewed',
 'membershipIsolationReviewed','liveBackendAndWebhookReviewed','privateAssetsVerified',
 'pricingTermsAndTaxReviewed','retentionErasureReviewed','refundAndRollbackRunbookReviewed',
 'requiredCodeChecksPassed'];
const WAVE_ONE=['boundary-builder-workbook','forge-workbook'];
function evaluate(m){
 const blockers=[];
 if(m?.environment!=='production_staging_review_only')blockers.push('wrong_environment');
 if(m?.checkoutEnabled!==false||m?.realMoneyCanaryAuthorized!==false||m?.generalSaleAuthorized!==false)blockers.push('all_payment_and_sale_gates_must_remain_off');
 if(m?.skipAutomatedSandboxBrowser!==true)blockers.push('must_record_explicitly_skipped_qa');
 if(!Array.isArray(m?.waveOne)||m.waveOne.length!==2||!WAVE_ONE.every(x=>m.waveOne.includes(x)))blockers.push('not_exact_wave_one');
 if(!/^[a-f0-9]{40}$/.test(m?.reviewedCommit||''))blockers.push('exact_reviewed_commit_required');
 for(const k of REQUIRED){
  const e=m?.evidence?.[k];
  if(e?.approved!==true||typeof e.reference!=='string'||!e.reference.trim())blockers.push(k);
 }
 // A staging review can never authorize actual deployment or live payment.
 return {eligibleForCheckoutDisabledStageReview:blockers.length===0,
  deploymentAuthorized:false,productionCheckoutEnabled:false,canaryAuthorized:false,
  publicSaleAuthorized:false,blockers};
}
module.exports={evaluate,REQUIRED,WAVE_ONE};
if(require.main===module){
 const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const result=evaluate(manifest);
 console.log(JSON.stringify(result,null,2));
 process.exitCode=result.eligibleForCheckoutDisabledStageReview?0:2;
}
