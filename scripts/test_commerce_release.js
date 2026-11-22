const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,REQUIRED}=require('./check_commerce_release.js');
const draft=require('../launch-backend-staging/commerce/release-review.json');
test('draft launch preflight is blocked',()=>{const x=evaluate(draft);assert.equal(x.readyForProductionReview,false);assert.equal(x.productionRuntimeEnabled,false);assert(x.blockers.includes('sandboxEndToEndPassed'));});
test('all evidenced approvals authorize review only, never enable runtime',()=>{const m={...draft,reviewedCommit:'a'.repeat(40),evidence:Object.fromEntries(REQUIRED.map(k=>[k,{approved:true,reference:'QA evidence reference'}]))};assert.deepEqual(evaluate(m),{readyForProductionReview:true,productionRuntimeEnabled:false,blockers:[]});assert.equal(evaluate({...m,productionCheckoutEnabled:true}).readyForProductionReview,false);assert.equal(evaluate({...m,firstWave:['forge-workbook']}).readyForProductionReview,false);});
