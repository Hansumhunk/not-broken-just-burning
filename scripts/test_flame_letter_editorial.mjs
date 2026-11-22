import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {ROOT,inspectInventory,buildDraft,plan,run} from "./flame_letter_editorial.mjs";

const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,"flame-letter-engine/catalog.json"),"utf8"));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"flame-letter-engine/manifest.json"),"utf8"));
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nbjb-eternal-flame-"));
 fs.mkdirSync(path.join(dir,"flame-letter-engine"));
 fs.writeFileSync(path.join(dir,"flame-letter-engine","catalog.json"),JSON.stringify(catalog));
 fs.writeFileSync(path.join(dir,"flame-letter-engine","manifest.json"),JSON.stringify(manifest));
 for(const t of catalog.topics)fs.writeFileSync(path.join(dir,t.source),
   "<html lang=\"en\"><head><title>Verified public source</title></head><body><main>Educational material</main></body></html>");
 return dir;
}
test("actual current public NBJB source pages pass controlled catalog review",()=>{
 assert.equal(inspectInventory(catalog,manifest,ROOT).reservedTopicIds.size,0);
});
test("four source-grounded DRAFTS, future planning dates, and no send capability",()=>{
 const {drafts,report}=plan({root:ROOT,catalog,manifest,asOf:"2026-11-21",weeks:4});
 assert.deepEqual(drafts.map(d=>d.proposedDate),["2026-11-25","2026-12-02","2026-12-09","2026-12-16"]);
 assert.equal(drafts.length,4);
 assert.equal(report.productionDistribution,"DISABLED");
 assert.equal(report.existingApprovedUpcoming,0);
 assert.ok(report.warnings.some(s=>s.includes("Fewer than four")));
 for(const d of drafts){
   assert.equal(d.status,"draft");
   assert.equal(d.sendable,false);
   assert.equal(d.approved,false);
   assert.match(d.plain,/One idea[\s\S]*One question[\s\S]*One practical tool[\s\S]*One action/);
   assert.match(d.html,/NOT APPROVED TO SEND/);
   assert.match(d.html,/privacy\.html/);
   assert.match(d.html,/\{\{ unsubscribe \}\}/);
   assert.match(d.plain,/\[\[REPLACE_WITH_VERIFIED_BUSINESS_MAILING_ADDRESS\]\]/);
   assert.match(d.source,/^https:\/\/notbrokenjustburning\.com\//);
   assert.doesNotMatch(d.html,/sk_live_|xkeysib-|service_role|private[_ -]?key/i);
 }
});
test("repeating the same as-of produces identical ids and immutable digests",()=>{
 const first=plan({catalog,manifest,root:ROOT,asOf:"2026-11-21"});
 const second=plan({catalog,manifest,root:ROOT,asOf:"2026-11-21"});
 assert.deepEqual(first.drafts.map(d=>[d.id,d.contentSha256]),second.drafts.map(d=>[d.id,d.contentSha256]));
});
test("approved entry consumes its slot and topic, never re-enters a duplicate",()=>{
 const m=clone(manifest);
 const previous=buildDraft(catalog.topics[0],"2026-11-25");
 m.approved.push({topicId:previous.topicId,proposedDate:previous.proposedDate,
  status:"approved",contentSha256:previous.contentSha256,reviewedBy:"Founder editorial",
  approvalEvidence:"Approved PR review external reference"});
 const {drafts,report}=plan({catalog,manifest:m,root:ROOT,asOf:"2026-11-21",weeks:4});
 assert.equal(drafts.length,3);
 assert.ok(drafts.every(d=>d.topicId!==previous.topicId&&d.proposedDate!=="2026-11-25"));
 assert.equal(report.existingApprovedUpcoming,1);
});
test("unsafe attempts to enable distribution are explicitly rejected",()=>{
 for(const key of Object.keys(manifest.publicationPolicy)){
   const m=clone(manifest);m.publicationPolicy[key]=true;
   assert.throws(()=>inspectInventory(catalog,m,ROOT),/HOLD BREACHED/);
 }
});
test("missing, private, noindex or traversal inputs fail closed",()=>{
 const dir=fixture();
 try{
   const bad=clone(catalog);bad.topics[0].source="../private/journal.html";
   assert.throws(()=>inspectInventory(bad,manifest,dir),/Unapproved source/);
   fs.rmSync(path.join(dir,catalog.topics[0].source));
   assert.throws(()=>inspectInventory(catalog,manifest,dir),/ENOENT/);
   fs.writeFileSync(path.join(dir,catalog.topics[0].source),
    '<title>Hidden</title><meta name="robots" content="noindex"><main>Private</main>');
   assert.throws(()=>inspectInventory(catalog,manifest,dir),/Noindex source/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("when source topics run out, hold remaining planned weeks instead of generating filler",()=>{
 const m=clone(manifest);
 m.suppressedIds=catalog.topics.slice(0,7).map(x=>x.id);
 const {drafts,report}=plan({catalog,manifest:m,root:ROOT,asOf:"2026-11-21",weeks:4});
 assert.equal(drafts.length,1);
 assert.equal(report.missingSlots.length,3);
 assert.ok(report.warnings.some(s=>s.includes("CATALOG EXHAUSTION")));
});
test("malicious editorial input is HTML-escaped; only a safe NBJB source URL is emitted",()=>{
 const altered={...catalog.topics[0],title:"Strong title <script>alert('x')</script>",idea:"Useful teaching <img src=x onerror=alert(1)> is not executable."};
 const d=buildDraft(altered,"2026-11-25");
 assert.doesNotMatch(d.html,/<script>|<img/);
 assert.match(d.html,/&lt;script&gt;/);
 assert.match(d.html,/https:\/\/notbrokenjustburning\.com\/story-boundaries\.html/);
});
test("CLI output remains offline, local, review-only and writes metadata alongside two formats",()=>{
 const dir=fixture();const out=path.join(dir,"staged");
 try{
   const report=run({root:dir,out,asOf:"2026-11-21",weeks:4});
   assert.equal(report.draftCount,4);
   const files=fs.readdirSync(out);
   assert.equal(files.filter(x=>x.endsWith(".html")).length,4);
   assert.equal(files.filter(x=>x.endsWith(".txt")).length,4);
   assert.equal(files.filter(x=>x.startsWith("draft-")&&x.endsWith(".json")).length,4);
   assert.equal(files.length,13);
   assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,"editorial-report.json"))).productionDistribution,"DISABLED");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
