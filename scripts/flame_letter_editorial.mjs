/**
 * Eternal Flame Engine — OFFLINE editorial replenishment, never a mail sender.
 * Node 22 standard library only. No Brevo/Supabase/API credentials or network.
 * Existing 31 provider campaigns are not imported, changed, or re-created here.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
export const ORIGIN="https://notbrokenjustburning.com";
const SOURCE=/^(?:story|guide|lesson|path)-[a-z0-9-]+\.html$/;
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_DATE=/^\d{4}-\d{2}-\d{2}$/;
const SHA=/^[a-f0-9]{64}$/;

function assert(ok,message){if(!ok)throw new Error(message);}
const sha=text=>crypto.createHash("sha256").update(text).digest("hex");
const escapeHtml=text=>String(text).replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
function readJson(filename){return JSON.parse(fs.readFileSync(filename,"utf8"));}
function utcDay(value){
 assert(SAFE_DATE.test(value),"Date must be YYYY-MM-DD");
 const date=new Date(value+"T00:00:00.000Z");
 assert(!Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value,"Invalid calendar date");
 return date;
}
function publicationSlots(asOf,count){
 assert(Number.isInteger(count)&&count>=1&&count<=12,"Count out of range");
 const start=utcDay(asOf);
 const offset=(3-start.getUTCDay()+7)%7 || 7; // Wednesday; planning only, not a sending schedule
 const first=new Date(start.getTime()+offset*86400000);
 return Array.from({length:count},(_,i)=>new Date(first.getTime()+i*7*86400000).toISOString().slice(0,10));
}
function manifestEntry(item){
 assert(item&&ID.test(item.topicId||""),"Manifest topicId invalid");
 assert(SAFE_DATE.test(item.proposedDate||""),"Manifest proposedDate missing");
 utcDay(item.proposedDate);
 assert(SHA.test(item.contentSha256||""),"Manifest hash invalid");
 assert(["draft","approved","published"].includes(item.status),"Manifest status invalid");
 if(item.status==="approved"){
   assert(typeof item.reviewedBy==="string"&&item.reviewedBy.trim().length>3,"Approval requires editor attribution");
   assert(typeof item.approvalEvidence==="string"&&item.approvalEvidence.trim().length>5,"Approval requires external evidence");
 }
}
export function inspectInventory(catalog,manifest,root=ROOT){
 assert(catalog?.schema===1&&Array.isArray(catalog.topics),"Catalog schema invalid");
 assert(manifest?.schema===1&&Array.isArray(manifest.approved)&&Array.isArray(manifest.published)&&Array.isArray(manifest.drafts),"Manifest schema invalid");
 const p=manifest.publicationPolicy;
 assert(p&&p.enabled===false&&p.founderApproved===false&&p.weeklyAudienceAuthorized===false&&p.approvedDispatchEnabled===false,
   "PUBLICATION HOLD BREACHED: engine requires all delivery gates false");
 const ids=new Set();
 for(const t of catalog.topics){
   assert(ID.test(t.id||"")&&!ids.has(t.id),"Duplicate or invalid topic id");
   ids.add(t.id);
   assert(SOURCE.test(t.source||""),"Unapproved source path: "+t.source);
   for(const field of ["title","theme","idea","question","tool","action"]){
     assert(typeof t[field]==="string"&&t[field].trim().length>=(field==="theme"?3:18)&&t[field].length<=1200,
       "Missing or out-of-range editorial "+field+" for "+t.id);
     assert(!/(\[\[|\{\{)/.test(t[field]),"Unresolved marker in topic "+t.id);
   }
   const html=fs.readFileSync(path.join(root,t.source),"utf8");
   assert(/<title[\s>]/i.test(html)&&/<main[\s>]/i.test(html),"Source not a valid NBJB public page: "+t.source);
   assert(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),"Noindex source: "+t.source);
 }
 const reservedTopicIds=new Set();
 const reservedDates=new Set();
 for(const item of [...manifest.drafts,...manifest.approved,...manifest.published]){
   manifestEntry(item);
   assert(ids.has(item.topicId),"Manifest references missing topic "+item.topicId);
   assert(!reservedTopicIds.has(item.topicId),"Duplicate approval/publication topic");
   assert(!reservedDates.has(item.proposedDate),"Duplicate approval/publication date");
   reservedTopicIds.add(item.topicId);reservedDates.add(item.proposedDate);
 }
 assert(Array.isArray(manifest.suppressedIds),"Manifest suppression list absent");
 for(const id of manifest.suppressedIds){
   assert(ID.test(id)&&ids.has(id),"Unknown suppression id");
   reservedTopicIds.add(id);
 }
 return {reservedTopicIds,reservedDates};
}
export function buildDraft(topic,date){
 utcDay(date);
 const url=ORIGIN+"/"+topic.source;
 const subject="The Flame Letter | "+topic.title;
 const preheader="One idea. One question. One practical tool. One action.";
 const body=[
   subject,preheader,"",
   "One idea","",
   topic.idea,"",
   "One question","",
   topic.question,"",
   "One practical tool","",
   topic.tool,"",
   "One action","",
   topic.action,"",
   "Read the original NBJB resource: "+url,"",
   "— The Flame Letter | Not Broken Just Burning",
   "See clearly. Burn clean. Build deliberately.","",
   "Educational personal-development material, not therapy, medical, legal or emergency services.",
   "Privacy & data use: "+ORIGIN+"/privacy.html",
   "Support & safety: "+ORIGIN+"/support.html",
   "Confirming a free account is NOT newsletter consent.",
   "Business mailing address: [[REPLACE_WITH_VERIFIED_BUSINESS_MAILING_ADDRESS]]",
   "Unsubscribe: {{ unsubscribe }}",
   "",
   "DRAFT FOR EDITORIAL REVIEW — NOT APPROVED TO SEND"
 ].join("\n");
 const lines=[
  '<!doctype html><html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  "<title>"+escapeHtml(subject)+"</title></head>",
  '<body style="margin:0;background:#f1eeea;color:#222;font-family:Arial,sans-serif">',
  '<main style="max-width:620px;margin:20px auto;background:white;padding:30px">',
  '<p style="color:#8d471d;font-weight:bold">NOT BROKEN JUST BURNING — THE FLAME LETTER</p>',
  "<h1>"+escapeHtml(topic.title)+"</h1>",
  '<p style="font-weight:bold">One idea. One question. One practical tool. One action.</p>',
  "<h2>One idea</h2><p>"+escapeHtml(topic.idea)+"</p>",
  "<h2>One question</h2><p>"+escapeHtml(topic.question)+"</p>",
  "<h2>One practical tool</h2><p>"+escapeHtml(topic.tool)+"</p>",
  "<h2>One action</h2><p>"+escapeHtml(topic.action)+"</p>",
  '<p><a href="'+url+'">Read the original NBJB resource</a></p>',
  '<footer style="border-top:1px solid #ddd;padding-top:16px;font-size:14px">',
  "<p>— The Flame Letter | Not Broken Just Burning<br>See clearly. Burn clean. Build deliberately.</p>",
  "<p>Educational personal-development material, not therapy, medical, legal or emergency services.</p>",
  '<p><a href="'+ORIGIN+'/privacy.html">Privacy &amp; data use</a> · <a href="'+ORIGIN+'/support.html">Support &amp; safety</a></p>',
  "<p>Free account registration is separate from voluntary newsletter consent.</p>",
  "<p>Business mailing address: [[REPLACE_WITH_VERIFIED_BUSINESS_MAILING_ADDRESS]]</p>",
  "<p>Unsubscribe: {{ unsubscribe }}</p>",
  '<p><strong>DRAFT FOR EDITORIAL REVIEW — NOT APPROVED TO SEND</strong></p>',
  "</footer></main></body></html>"
 ];
 const html=lines.join("\n")+"\n";
 const id="draft-"+date+"-"+topic.id;
 const contentSha256=sha(body+"\n"+html);
 return {id,topicId:topic.id,theme:topic.theme,proposedDate:date,subject,source:url,sourceFile:topic.source,
   status:"draft",emailAudience:"general-flame-letter",approved:false,sendable:false,contentSha256,
   html,plain:body+"\n"};
}
export function plan({catalog,manifest,root=ROOT,asOf="2026-11-21",weeks=4}){
 const {reservedTopicIds,reservedDates}=inspectInventory(catalog,manifest,root);
 const slots=publicationSlots(asOf,weeks);
 const outstanding=slots.filter(date=>!reservedDates.has(date));
 const topics=catalog.topics.filter(t=>!reservedTopicIds.has(t.id));
 const drafts=outstanding.slice(0,topics.length).map((date,i)=>buildDraft(topics[i],date));
 const missingSlots=outstanding.slice(drafts.length);
 const approvedUpcoming=manifest.approved.filter(x=>x.proposedDate>=asOf).length;
 const report={
  generatedAt:"reproducible, evaluated from as-of input, not real-time provider data",
  asOf,proposedPlanningSlots:slots,existingApprovedUpcoming:approvedUpcoming,
  draftCount:drafts.length,missingSlots,remainingUnusedTopics:topics.length-drafts.length,
  legacyProviderWeeklyEditions:"12 confirmed in private archive; not copied into public manifest and not counted as approved",
  productionDistribution:"DISABLED",
  warnings:[
    "Proposed dates are editorial planning targets, not authorized send times.",
    "All generated text is a DRAFT; founder/editorial approval is required before any scheduling.",
    "Existing provider inventory, consent, suppression, send queues and subscriber metrics are NOT read by this offline engine.",
    ...(approvedUpcoming<4?["Fewer than four approved upcoming editions in this local manifest; reconcile provider inventory privately before launch."]:[]),
    ...(missingSlots.length?["CATALOG EXHAUSTION: hold publication and add reviewed public-source candidates; never send filler."]:[])
  ]
 };
 return {drafts,report};
}
export function run({root=ROOT,out=path.join(ROOT,".flame-letter-staging"),asOf="2026-11-21",weeks=4}={}){
 const catalog=readJson(path.join(root,"flame-letter-engine","catalog.json"));
 const manifest=readJson(path.join(root,"flame-letter-engine","manifest.json"));
 const {drafts,report}=plan({catalog,manifest,root,asOf,weeks});
 fs.mkdirSync(out,{recursive:true});
 for(const d of drafts){
   fs.writeFileSync(path.join(out,d.id+".html"),d.html);
   fs.writeFileSync(path.join(out,d.id+".txt"),d.plain);
   const {html,plain,...metadata}=d;
   fs.writeFileSync(path.join(out,d.id+".json"),JSON.stringify(metadata,null,2)+"\n");
 }
 const proposed={...manifest,drafts:[...manifest.drafts,...drafts.map(d=>({topicId:d.topicId,proposedDate:d.proposedDate,status:"draft",contentSha256:d.contentSha256}))]};
 fs.writeFileSync(path.join(out,"proposed-manifest.json"),JSON.stringify(proposed,null,2)+"\n");
 fs.writeFileSync(path.join(out,"editorial-report.json"),JSON.stringify(report,null,2)+"\n");
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
   const opts=Object.fromEntries(process.argv.slice(2).map(arg=>{
     assert(/^--(?:as-of|weeks|out)=/.test(arg),"Only --as-of, --weeks, --out options permitted");
     return arg.slice(2).split(/=(.*)/s).slice(0,2);
   }));
   const report=run({asOf:opts["as-of"]||new Date().toISOString().slice(0,10),
     weeks:opts.weeks?Number(opts.weeks):4,
     out:opts.out?path.resolve(opts.out):undefined});
   process.stdout.write(JSON.stringify(report,null,2)+"\n");
 }catch(error){console.error("Editorial engine FAIL:",error.message);process.exitCode=1;}
}
