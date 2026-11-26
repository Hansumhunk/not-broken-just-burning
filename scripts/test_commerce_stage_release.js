const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {evaluate,REQUIRED,WAVE_ONE}=require('./check_commerce_stage_release');
const draft=require('../launch-backend-staging/commerce/stage-review.json');
const core=fs.readFileSync('launch-backend-staging/commerce/live/commerce-core.mjs','utf8');
const release=fs.readFileSync('js/commerce-release.js','utf8');
const review=require('../launch-backend-staging/commerce/release-review.json');
test('staging draft fails closed with all founder review evidence unapproved',()=>{
 const result=evaluate(draft);
 assert.equal(result.eligibleForCheckoutDisabledStageReview,false);
 assert.equal(result.productionCheckoutEnabled,false);
 assert.equal(result.canaryAuthorized,false);
 assert.equal(result.publicSaleAuthorized,false);
 assert.equal(result.deploymentAuthorized,false);
 assert.ok(result.blockers.includes('founderStageApproval'));
 assert.deepEqual(draft.waveOne,WAVE_ONE);
});
test('even hypothetical complete staged-review evidence never authorizes live deploy or purchase',()=>{
 const m={...draft,reviewedCommit:'a'.repeat(40),
   evidence:Object.fromEntries(REQUIRED.map(k=>[k,{approved:true,reference:'reviewed source evidence'}]))};
 const result=evaluate(m);
 assert.equal(result.eligibleForCheckoutDisabledStageReview,true);
 for(const k of ['deploymentAuthorized','productionCheckoutEnabled','canaryAuthorized','publicSaleAuthorized'])assert.equal(result[k],false);
 for(const violation of [{checkoutEnabled:true},{realMoneyCanaryAuthorized:true},{generalSaleAuthorized:true},{environment:'production'},{skipAutomatedSandboxBrowser:false},{waveOne:['boundary-builder-workbook']}])
   assert.equal(evaluate({...m,...violation}).eligibleForCheckoutDisabledStageReview,false);
});
test('locked source code, original strict release gate and sandbox-fail status are preserved',()=>{
 assert.match(core,/export const LIVE_RUNTIME_REVIEWED\s*=\s*false;/);
 assert.match(release,/enabled:false/);
 assert.equal(review.productionCheckoutEnabled,false);
 assert.equal(review.evidence.sandboxEndToEndPassed.approved,false);
 assert.equal(review.evidence.browserAcceptancePassed.approved,false);
});
