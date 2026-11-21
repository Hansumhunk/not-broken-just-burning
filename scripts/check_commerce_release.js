// Advisory release-readiness check; no code path enables production checkout.
// Execution of the current worker remains sandbox-only regardless of this result.
const fs=require('node:fs');
const REQUIRED=['founderLaunchApproval','finishedAssetsApproved','finalPricingApproved','taxApproved','termsApproved','retentionApproved','securityReviewPassed','sandboxEndToEndPassed','browserAcceptancePassed','reconciliationRunbookApproved','productionMigrationReviewed','canaryConfigurationReviewed','rollbackRehearsed'];
const WAVE_ONE=['boundary-builder-workbook','forge-workbook'];
function evaluate(manifest){
 const blockers=[];
 if(manifest?.productionCheckoutEnabled!==false)blockers.push('production_checkout_must_remain_false_in_this_draft');
 if(manifest?.environment!=='production_review_only')blockers.push('incorrect_manifest_environment');
 for(const name of REQUIRED)if(manifest?.evidence?.[name]?.approved!==true||typeof manifest.evidence[name].reference!=='string'||!manifest.evidence[name].reference.trim())blockers.push(name);
 if(!Array.isArray(manifest?.firstWave)||manifest.firstWave.length!==2||!WAVE_ONE.every(s=>manifest.firstWave.includes(s)))blockers.push('first_wave_mismatch');
 if(!/^[a-f0-9]{40}$/.test(manifest?.reviewedCommit||''))blockers.push('reviewed_commit_required');
 // All approvals can only authorize a SEPARATE reviewed production PR.
 return Object.freeze({readyForProductionReview:blockers.length===0,productionRuntimeEnabled:false,blockers});
}
module.exports={evaluate,REQUIRED};
if(require.main===module){
 const result=evaluate(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
 console.log(JSON.stringify(result,null,2));process.exitCode=result.readyForProductionReview?0:2;
}
