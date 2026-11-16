/**
 * #29 — Spirit of Reach: read-only NBJB audience growth brief generator.
 * Uses only published sitemap pages and optional anonymous public topic counts.
 * Does not publish, draft protected curriculum, read member data or claim traffic.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ORIGIN="https://notbrokenjustburning.com";
const FEEDS=[
  {name:"Daddit",url:"https://www.reddit.com/r/daddit/.rss"},
  {name:"MensLib",url:"https://www.reddit.com/r/MensLib/.rss"}
];
export const TOPICS=Object.freeze([
  {
    id:"boundaries",name:"Boundaries without cruelty",question:"How can a man set a firm boundary without escalating a conflict?",
    pattern:/\b(boundar(?:y|ies)|assertiv(?:e|eness)|respect|conflict|say no)\b/i,
    proposedQuery:"how to set boundaries without being cruel",
    h2:["What is within your control?","Turn the boundary into a clear behavior","What to do when the line is crossed"],
    exercise:"Write one boundary as an action you will take, not a demand that someone else must obey.",
    social:"A boundary is not a threat. It is a decision about what you will do when a line is crossed.",
    cta:"resources.html",ctaLabel:"Boundary Builder and free reflection tools"
  },
  {
    id:"fatherhood",name:"Fatherhood under pressure",question:"What can a father do today when family stress is draining his attention?",
    pattern:/\b(father(?:hood)?|dad(?:s)?|parent(?:s|ing)?|child(?:ren)?|custody|co.parent)\b/i,
    proposedQuery:"fatherhood under pressure practical steps",
    h2:["Separate the situation from today's parenting task","Choose one reliable connection ritual","Review what is working without blaming the child"],
    exercise:"Pick one repeatable ten-minute point of connection and write down when you can keep it.",
    social:"A child does not need a flawless father. Consistent presence and one kept promise can matter more than a perfect speech.",
    cta:"resources.html",ctaLabel:"Free reflection and next-action tools"
  },
  {
    id:"overwhelm",name:"Overwhelm to one useful action",question:"How do you find your next step when the whole situation feels too big?",
    pattern:/\b(overwhelm(?:ed|ing)?|burnout|stress|pressure|chaos|uncertain|confus(?:ion|ed)|anxiety)\b/i,
    proposedQuery:"how to make decisions when overwhelmed",
    h2:["Name what is happening right now","Separate urgency from noise","Choose a task that fits today's capacity"],
    exercise:"Write what is urgent, what can wait and one action you can complete in twenty minutes.",
    social:"When everything is urgent, the first job is to decide what actually needs your attention today.",
    cta:"resources.html",ctaLabel:"One Stone and Flame Check-In"
  },
  {
    id:"self-trust",name:"Rebuilding self-trust",question:"How can someone rebuild trust in their judgment after a painful relationship?",
    pattern:/\b(betrayal|trust|self.trust|divorce|separat(?:ion|ed)|relationship|breakup)\b/i,
    proposedQuery:"rebuilding self trust after betrayal",
    h2:["Distinguish what happened from what you concluded","Choose one decision you can verify","Restore trust through repeated follow-through"],
    exercise:"Choose one low-stakes decision, record why you made it and revisit the actual outcome.",
    social:"Rebuilding self-trust does not require perfect certainty. It starts with making one grounded decision and following through.",
    cta:"forge.html",ctaLabel:"The Forge: examine a difficult thought"
  },
  {
    id:"shame",name:"Shame versus responsibility",question:"How do you own your next decision without turning every setback into an identity?",
    pattern:/\b(shame|guilt|accountab(?:le|ility)|responsib(?:le|ility)|worthlessness|embarrass(?:ed|ment))\b/i,
    proposedQuery:"difference between shame and accountability men",
    h2:["Recognize the language of shame","Describe behavior without condemning identity","Turn accountability into repair"],
    exercise:"Replace one global self-judgment with a specific action you can change.",
    social:"Accountability asks what you can repair. Shame tells you that you are the damage. Those are not the same conversation.",
    cta:"lessons.html",ctaLabel:"Public educational lessons"
  },
  {
    id:"direction",name:"Rebuilding direction after disruption",question:"What helps a man recover a sense of purpose without rushing his grief?",
    pattern:/\b(purpose|identity|rebuild(?:ing)?|direction|lonel(?:y|iness)|grief|lost|isolat(?:ion|ed))\b/i,
    proposedQuery:"finding direction after life falls apart",
    h2:["Let the loss be real without assigning destiny","Name the values you still control","Make a seven-day plan rather than a lifetime promise"],
    exercise:"List two values that survived the disruption and one small behavior that honors each.",
    social:"You do not need to know your entire next chapter to choose the next responsible page.",
    cta:"path.html",ctaLabel:"The Flamewalker Path"
  }
]);
const PUBLIC_DOMAIN_NAMES=new Set(["www.reddit.com"]);
const REQUEST_WORDS=/\b(?:how|what|why|help|struggl(?:e|ing)|advice|any suggestions|what do i do|where do i start)\b/i;
const clean=s=>String(s??"").replace(/<[^>]*>/g," ").replace(/&(?:amp|lt|gt|quot);/g,m=>({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"'}[m]||m)).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g," ").trim();
const escapeTable=s=>String(s??"").replace(/[|<>\r\n]/g," ").slice(0,200);
function tagText(html,tag){
 return clean(html.match(new RegExp("<"+tag+"\\b[^>]*>([\\s\\S]*?)<\\/"+tag+">","i"))?.[1]||"");
}
function description(html){
 return clean((html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i)
    ||html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["']/i))?.[1]||"");
}
export function catalogPublicPages(sitemap,readFile){
 const result=[],seen=new Set();
 const matches=[...String(sitemap).matchAll(/<loc>\s*(https:\/\/[^<\s]+)\s*<\/loc>/gi)].slice(0,160);
 for(const item of matches){
   let file;let url;
   try{
     url=new URL(item[1]);
     if(url.origin!==ORIGIN || url.search || url.hash)continue;
     file=url.pathname==="/"?"index.html":url.pathname.slice(1);
     if(!/^[a-z0-9-]+\.html$/.test(file)||seen.has(file))continue;
   }catch{continue}
   seen.add(file);
   const html=readFile(file);
   if(typeof html!=="string")continue;
   if(/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html))continue;
   const title=tagText(html,"title"),h1=tagText(html,"h1"),desc=description(html);
   result.push({file,url:url.href,title,h1,description:desc});
 }
 return result;
}
export function extractHeadings(xml){
 const titles=[];
 for(const block of String(xml).matchAll(/<(entry|item)\b[^>]*>[\s\S]*?<\/\1>/gi)){
  const raw=block[0].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if(raw){titles.push(clean(raw).slice(0,180));if(titles.length>=30)break;}
 }
 return titles;
}
export function topicCounts(titles,topics=TOPICS){
 return topics.map(topic=>({
   id:topic.id,
   mentions:titles.filter(t=>topic.pattern.test(t)).length,
   questionSignals:titles.filter(t=>topic.pattern.test(t)&&REQUEST_WORDS.test(t)).length
 }));
}
export function rankReachIdeas(pages,counts,feedCount,topics=TOPICS){
 const counted=new Map(counts.map(x=>[x.id,x]));
 return topics.map(t=>{
   const matches=pages.map(page=>({
      ...page,matchScore:(t.pattern.test(page.title)?3:0)+(t.pattern.test(page.h1)?2:0)+(t.pattern.test(page.description)?1:0)
   })).filter(p=>p.matchScore>0).sort((a,b)=>b.matchScore-a.matchScore||a.file.localeCompare(b.file));
   const relevant=matches.filter(p=>p.matchScore>=3);
   const observations=counted.get(t.id)||{mentions:0,questionSignals:0};
   const gap=relevant.length===0?4:relevant.length===1?2:0;
   const score=gap+(feedCount?Math.min(observations.mentions,4)+Math.min(observations.questionSignals,2):0);
   const action=relevant.length?"Improve or expand existing content":"Research a distinct new public article";
   const similar=relevant.slice(0,2);
   return {...t,score,action,similar,
     siteCoverage:relevant.length,publicMentions:feedCount?observations.mentions:null,
     publicQuestions:feedCount?observations.questionSignals:null,
     signalStatus:feedCount?"Public feed headings only; not measured search traffic":"No verified audience signal; editorial hypothesis only"};
 }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}
export function growthReport(ideas,{feedCount=0,sampleCount=0,pageCount=0,feedNotes=[]}={}){
 const lines=["# 🔥 #29 Spirit of Reach — Weekly Growth Briefs","",
 "Founder-reviewed, **draft-only** audience development. No publication, posting, outreach, member access, AI API, or website changes.","",
 "## Research coverage","",
 "- Published sitemap pages scanned: **"+pageCount+"**.",
 "- Public discussion headings sampled: **"+(feedCount?sampleCount:"unverified (no accessible feeds)")+"**.",
 "- Data used: published page titles, visible headings, descriptions, and anonymous aggregate public topic counts.",
 "- Not used: search rankings, PostHog conversion figures, Metricool scheduled calendar, private manuscripts, individual stories or customer data.",
 ...feedNotes.map(note=>"- "+escapeTable(note)),"",
 "## Prioritized editorial opportunities","",
 "| Theme | Public topic signal | Site coverage | Recommended approach |",
 "| --- | --- | --- | --- |"];
 for(const t of ideas.slice(0,6)){
  const observation=feedCount?t.publicMentions+" matching headings ("+t.publicQuestions+" question-style)":"unverified";
  lines.push("| "+escapeTable(t.name)+" | "+observation+" | "+t.siteCoverage+" relevant published pages | "+escapeTable(t.action)+" |");
 }
 lines.push("","## Three review-ready content briefs","");
 for(const [i,t] of ideas.slice(0,3).entries()){
  lines.push("### "+(i+1)+". "+t.name,"",
   "**Reader question:** "+t.question,
   "**Search phrase hypothesis (not a verified ranking term):** "+t.proposedQuery,
   "**Content decision:** "+t.action+".",
   "**Public pages to check for overlap:** "+(t.similar.length?t.similar.map(p=>"["+escapeTable(p.file)+"]("+p.url+")").join(", "):"No clearly relevant page title/H1 observed; check the site and existing drafts before creating another page."),
   "**Suggested article outline:**");
  for(const h of t.h2)lines.push("- "+h);
  lines.push("**One useful exercise:** "+t.exercise,
   "**Proposed social TEXT hook (not approved for posting):** "+t.social,
   "**Internal path:** ["+t.ctaLabel+"]("+ORIGIN+"/"+t.cta+").",
   "**Evidence:** "+t.signalStatus+".",
   "**Next editorial gate:** Compare against Metricool's upcoming content and protected curriculum with the existing authorized editorial workflow. Decide whether to update a current page or create a truly different article.",
   "");
 }
 lines.push("## Measurement after founder approval","",
 "- If an article is eventually published, compare anonymous organic entrances and relevant pageviews in the existing PostHog reports across comparable periods; do not claim a true signup conversion without matched events.",
 "- Re-check the next scheduled social calendar before approving any copy; this script cannot see Metricool.",
 "- First move: approve or reject **one** draft brief, then measure real interest before multiplying content.",
 "",
 "**Founder boundaries:** Never publish, schedule a post, produce video, generate private member/court content, buy ads, change live pages, open a checkout or send outreach. No urgency/fear exploitation, diagnosis, medical promises or gender warfare.");
 return lines.join("\n")+"\n";
}
async function getFeed(url){
 try{
  const u=new URL(url);
  if(u.protocol!=="https:"||!PUBLIC_DOMAIN_NAMES.has(u.hostname))return {ok:false,status:"blocked domain"};
  const response=await fetch(url,{headers:{"User-Agent":"NBJB-Flame-Reach/1.0 (public aggregate audience research)"},signal:AbortSignal.timeout(7000)});
  if(!response.ok)return {ok:false,status:"HTTP "+response.status};
  const body=await response.text();
  if(body.length>240000)return {ok:false,status:"large feed response"};
  return {ok:true,body};
 }catch{return {ok:false,status:"unavailable or timed out"};}
}
export async function runReach({root=ROOT,request=getFeed}={}){
 const readFile=name=>{
  const safeFile=/^[a-z0-9-]+\.html$/.test(name);
  if(!safeFile)return null;
  const p=path.join(root,name);
  return fs.existsSync(p)?fs.readFileSync(p,"utf8"):null;
 };
 const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
 const pages=catalogPublicPages(sitemap,readFile);
 const headings=[],notes=[];let feedCount=0;
 for(const feed of FEEDS){
  const result=await request(feed.url);
  if(result.ok&&/<(?:entry|item)\b/i.test(result.body)){
   const sampled=extractHeadings(result.body);
   headings.push(...sampled);feedCount++;notes.push(feed.name+": "+sampled.length+" public headlines sampled, identities excluded.");
  }else notes.push(feed.name+": unavailable ("+(result.status||"unreadable response")+"); no demand inference.");
 }
 const ranked=rankReachIdeas(pages,topicCounts(headings),feedCount);
 return growthReport(ranked,{feedCount,sampleCount:headings.length,pageCount:pages.length,feedNotes:notes});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const report=await runReach();
  process.stdout.write(report);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
 }catch(err){
  process.stderr.write("Reach scout failed to build its public-source brief: "+String(err.message).slice(0,120)+"\n");
  process.exitCode=1;
 }
}
