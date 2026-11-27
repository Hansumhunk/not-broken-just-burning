import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const checks={
 'contact.html':['support@notbrokenjustburning.com','billing@notbrokenjustburning.com','contact@notbrokenjustburning.com','partnerships@notbrokenjustburning.com'],
 'refunds.html':['billing@notbrokenjustburning.com'],
 'member-store.html':['billing@notbrokenjustburning.com'],
 'terms.html':['billing@notbrokenjustburning.com','contact@notbrokenjustburning.com'],
 'privacy.html':['privacy@notbrokenjustburning.com'],
 'join.html':['contact@notbrokenjustburning.com','partnerships@notbrokenjustburning.com'],
 'commerce-policy-live-review.html':['support@notbrokenjustburning.com','billing@notbrokenjustburning.com']
};
for(const [path,addresses] of Object.entries(checks)){
 test(path+' uses professional Flame Post inboxes without breaking links',()=>{
   const s=source(path);
   assert.doesNotMatch(s,/notbrokenjustburning@gmail\.com/i);
   for(const a of addresses){
     assert.ok(s.includes('mailto:'+a),'missing mailto for '+a);
   }
 });
}
test('final restricted terms retain professional routing, explicit release boundary and disabled public purchases',()=>{
 const s=source('commerce-policy-live-review.html');
 const store=source('store.html');
 assert.match(s,/Final purchase terms — boundary-004c-v1\.0/);
 assert.match(s,/Effective only upon separately authorized restricted Florida release/);
 assert.match(s,/not a public offer and does not itself enable checkout/);
 assert.match(s,/does not record consent or authorize payment/);
 assert.match(s,/fourteen calendar days/);
 assert.match(s,/billing location is outside Florida or the total exceeds \$14\.99 USD/);
 assert.match(source('commerce-live-canary.html'),/I confirm that I am the authorized Florida purchaser/);
 assert.match(source('commerce-release.js'),/enabled:false/);
 assert.match(store,/data-commerce-buy="boundary-builder-workbook" disabled/);
 assert.match(store,/data-commerce-buy="forge-workbook" disabled/);
});
