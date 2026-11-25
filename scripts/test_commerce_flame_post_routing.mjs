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
 'commerce-policy-live-review.html':['support@notbrokenjustburning.com']
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
test('consumer terms and publication gates remain unaffected by correspondence-only edits',()=>{
 const s=source('commerce-policy-live-review.html');
 const store=source('store.html');
 assert.match(s,/Draft for founder review only/);
 assert.match(s,/not an effective offer/);
 assert.match(store,/data-commerce-buy="boundary-builder-workbook" disabled/);
 assert.match(store,/data-commerce-buy="forge-workbook" disabled/);
});
