import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { catalogPublicPages, extractHeadings, topicCounts, rankReachIdeas, growthReport, runReach, TOPICS } from "./flame_spirit_reach.mjs";

const base="https://notbrokenjustburning.com";
const sitemap='<urlset><loc>'+base+'/</loc><loc>'+base+'/resources.html</loc><loc>'+base+'/story-boundaries.html</loc><loc>'+base+'/member-private.html</loc><loc>https://evil.example/journal.html</loc></urlset>';
const pages={
  "index.html":'<html><title>Home — Men Finding Direction</title><h1>Purpose after disruption</h1><meta name="description" content="Men rebuilding direction and clarity"></html>',
  "resources.html":'<html><title>Reflection Tools for Overwhelm</title><h1>Boundary Builder tools</h1><meta name="description" content="Free tools to set boundaries"></html>',
  "story-boundaries.html":'<html><title>Boundaries are actions</title><h1>Boundaries without cruelty</h1><meta name="description" content="Understand and honor boundaries"></html>',
  "member-private.html":'<meta name="robots" content="noindex"><title>Secret</title><h1>Secret</h1>'
};
const c=()=>catalogPublicPages(sitemap,name=>pages[name]);
const mockFeed='<feed><entry><title>How do I set boundaries with family?</title><author><name>PrivatePerson</name></author><content>PrivateStory</content></entry><entry><title>How can a dad show up under stress?</title></entry></feed>';
test("Catalog reads only sitemap-origin public pages, excluding noindex and external domains",()=>{
 const found=c(); assert.equal(found.length,3);
 assert.ok(found.every(x=>x.file!=="member-private.html"&&x.url.startsWith(base)));
 assert.equal(found.find(x=>x.file==="resources.html").h1,"Boundary Builder tools");
});
test("Catalog does not allow directory traversal or non-html files",()=>{
 const extra=sitemap.replace("</urlset>","<loc>"+base+"/../secrets.txt</loc><loc>"+base+"/member-private.html?x=y</loc></urlset>");
 const found=catalogPublicPages(extra,name=>pages[name]);assert.equal(found.length,3);
});
test("Community inputs aggregate headings and never return authors or body text",()=>{
 const titles=extractHeadings(mockFeed);
 assert.equal(titles.length,2);
 assert.doesNotMatch(titles.join(","),/PrivatePerson|PrivateStory/);
 const s=topicCounts(titles);
 assert.ok(s.find(x=>x.id==="boundaries").mentions>0);
 assert.ok(s.find(x=>x.id==="fatherhood").mentions>0);
});
test("Content overlap triggers update-existing rather than duplicate article",()=>{
 const ranked=rankReachIdeas(c(),topicCounts([]),0);
 const b=ranked.find(x=>x.id==="boundaries");
 assert.ok(b.siteCoverage>=1);
 assert.equal(b.action,"Improve or expand existing content");
 assert.ok(b.similar.some(x=>x.file==="story-boundaries.html"));
});
test("No relevant page gets distinct article research recommendation",()=>{
 const ranked=rankReachIdeas(c(),topicCounts([]),0);
 const f=ranked.find(x=>x.id==="fatherhood");
 assert.equal(f.siteCoverage,0);
 assert.equal(f.action,"Research a distinct new public article");
});
test("Missing public feeds remains unverified and never asserts traffic or demand",()=>{
 const report=growthReport(rankReachIdeas(c(),topicCounts([]),0),{pageCount:3,feedCount:0,feedNotes:["Feed blocked"]});
 assert.match(report,/unverified/i);
 assert.match(report,/Search phrase hypothesis/);
 assert.doesNotMatch(report,/we achieved|organic visitors increased|verified rankings|Metricool scheduled posts are/i);
 assert.match(report,/cannot see Metricool/i);
});
test("Briefs include a practical exercise, grounded CTA and no videos",()=>{
 const output=growthReport(rankReachIdeas(c(),topicCounts(extractHeadings(mockFeed)),1),{pageCount:3,feedCount:1,sampleCount:2});
 assert.match(output,/One useful exercise/);
 assert.match(output,/not approved for posting/);
 assert.match(output,/not a verified ranking term/);
 assert.match(output,/Founder boundaries/);
 assert.doesNotMatch(output,/PrivatePerson|PrivateStory/);
 assert.ok((output.match(/### \d\./g)||[]).length===3);
});
test("End-to-end report using only fixture files and injected public feed",async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"nbjb-reach-"));
 try{
  fs.writeFileSync(path.join(temp,"sitemap.xml"),sitemap);
  for(const [name,html] of Object.entries(pages))fs.writeFileSync(path.join(temp,name),html);
  const calls=[];
  const report=await runReach({root:temp,request:async url=>{calls.push(url);return {ok:true,body:mockFeed}}});
  assert.equal(calls.length,2);
  assert.ok(calls.every(u=>u.startsWith("https://www.reddit.com/")));
  assert.match(report,/Spirit of Reach/);
  assert.match(report,/2 public headlines sampled/);
  assert.doesNotMatch(report,/PrivatePerson|PrivateStory/);
 } finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test("No-source fallback still produces useful draft recommendations",async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"nbjb-reach-"));
 try{
  fs.writeFileSync(path.join(temp,"sitemap.xml"),sitemap);
  for(const [name,html] of Object.entries(pages))fs.writeFileSync(path.join(temp,name),html);
  const report=await runReach({root:temp,request:async()=>({ok:false,status:"HTTP 403"})});
  assert.match(report,/unverified/);assert.match(report,/Prioritized editorial opportunities/);
  assert.match(report,/No verified audience signal/);
 } finally{fs.rmSync(temp,{recursive:true,force:true});}
});
