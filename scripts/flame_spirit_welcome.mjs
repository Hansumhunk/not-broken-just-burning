/**
 * #30 Spirit of Welcome — public-source, read-only conversion-path audit.
 * Inspects published HTML and known public JS route references, never identities,
 * sessions, user-entered reflections, billing, backend state, or visitor analytics.
 * Reports route evidence and founder-reviewable friction hypotheses, NOT conversion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ORIGIN="https://notbrokenjustburning.com";
export const SCREENS=Object.freeze([
  {file:"index.html",label:"Public homepage"},
  {file:"join.html",label:"Join / free-account invitation"},
  {file:"member-auth.html",label:"Account access"},
  {file:"member-onboarding.html",label:"Optional onboarding"},
  {file:"members.html",label:"Member dashboard"},
  {file:"member-start-here.html",label:"First free lesson"},
  {file:"member-framework.html",label:"Next free framework lesson"},
  {file:"member-lessons.html",label:"Member learning catalog"},
  {file:"member-store.html",label:"Membership explanation"},
  {file:"flamewalker-plus.html",label:"Paid offer preview"}
]);
export const JOURNEY=Object.freeze([
 {from:"index.html",to:"join.html",label:"Discovery → join"},
 {from:"join.html",to:"member-auth.html",label:"Join → create free account"},
 {from:"member-onboarding.html",to:"members.html",label:"Onboarding → dashboard"},
 {from:"members.html",to:"member-start-here.html",label:"Dashboard → first free lesson"},
 {from:"member-start-here.html",to:"member-framework.html",label:"First lesson → next framework"},
 {from:"member-lessons.html",to:"member-start-here.html",label:"Lesson catalog → free foundation"},
 {from:"members.html",to:"member-store.html",label:"Dashboard → membership overview"},
 {from:"flamewalker-plus.html",to:"member-auth.html",label:"Paid preview → account door"}
]);
const formatPath=s=>String(s??"").replace(/[|<>\r\n\`[\]]/g," ").slice(0,100);
const clean=s=>String(s??"").replace(/<[^>]*>/g," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();
function bodyVisible(html){
 return String(html??"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi," ");
}
export function linkTargets(html){
 const out=[];
 for(const match of bodyVisible(html).matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)){
  const href=match[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  if(!href)continue;
  try{
   const u=new URL(href.replace(/&amp;/gi,"&"),ORIGIN+"/");
   if(u.origin!==ORIGIN||u.pathname==="/"&&href.startsWith("#"))continue;
   if(u.pathname==="/"){out.push({file:"index.html",label:clean(match[2]).slice(0,100)});continue;}
   const pathname=decodeURIComponent(u.pathname.slice(1));
   if(!/^[a-z0-9-]+\.html$/i.test(pathname))continue;
   out.push({file:pathname,label:clean(match[2]).slice(0,100)});
  }catch{}
 }
 return out;
}
export function auditWelcome(readFile){
 const files=new Map();
 const get=file=>{
  if(!files.has(file))files.set(file,readFile(file));
  return files.get(file);
 };
 const results=[],findings=[];
 for(const screen of SCREENS){
  const html=get(screen.file);
  if(typeof html!=="string"||!html.includes("<html")){
   findings.push({severity:"critical",source:screen.file,detail:"Expected HTML entry point missing; verify repository path"});
   results.push({file:screen.file,label:screen.label,exists:false,links:0});
   continue;
  }
  results.push({file:screen.file,label:screen.label,exists:true,links:linkTargets(html).length});
 }
 const routes=[];
 for(const step of JOURNEY){
  const html=get(step.from);
  const present=typeof html==="string" && linkTargets(html).some(link=>link.file===step.to);
  const destination=typeof get(step.to)==="string";
  routes.push({...step,present,destination});
  if(!destination)continue; // missing screen is already its own critical item
  if(!present) findings.push({severity:"review",source:step.from,
      detail:"No direct anchor to "+step.to+" for "+step.label+". May use JavaScript; review the user journey."});
 }
 const authHtml=get("member-auth.html")||"";
 const authJs=get("js/member-auth.js")||"";
 const checks=[
  {name:"Sign-up form is present",ok:/<form\b[^>]*\bid=["']sign-up-form["']/i.test(authHtml)},
  {name:"Sign-up JavaScript references onboarding route",ok:/signUp\s*\(/.test(authJs)&&authJs.includes("member-onboarding.html")},
  {name:"Authentication script is loaded by account page",ok:/<script\b[^>]*\bsrc=["']js\/member-auth\.js["']/i.test(authHtml)},
  {name:"Join page explains a free account",ok:/\bfree\b/i.test(bodyVisible(get("join.html")||""))&&/member-auth\.html/i.test(get("join.html")||"")},
  {name:"Free membership is distinguished from the optional paid tier",ok:/flamewalker\+/i.test(bodyVisible(get("join.html")||""))&&/\bfree\b/i.test(bodyVisible(get("join.html")||""))},
  {name:"Onboarding communicates device-local privacy",ok:/\b(?:device|browser)\b/i.test(bodyVisible(get("member-onboarding.html")||""))},
  {name:"Onboarding offers an optional skip path",ok:/skip setup for now/i.test(clean(bodyVisible(get("member-onboarding.html")||"")))},
  {name:"First lesson is marked as free",ok:/\bfree\b/i.test(bodyVisible(get("member-start-here.html")||""))},
  {name:"Membership page distinguishes free from paid access",ok:/\bfree\b/i.test(bodyVisible(get("member-store.html")||""))&&/flamewalker\+/i.test(bodyVisible(get("member-store.html")||""))}
 ];
 for(const c of checks)if(!c.ok)findings.push({severity:"review",source:"copy or route check",detail:c.name+" — needs human verification"});
 const gated=["member-onboarding.html","members.html","member-start-here.html","member-framework.html","member-lessons.html","member-store.html"];
 for(const file of gated){
  const html=get(file)||"";
  if(!/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html)){
   findings.push({severity:"review",source:file,detail:"Expected noindex directive not found; inspect member-page indexing boundaries"});
  }
 }
 const broken=[];
 // Only audit known public anchor destinations. Missing routes in other website
 // sections are covered by the existing whole-site validator.
 for(const screen of SCREENS){
  const html=get(screen.file);
  if(typeof html!=="string")continue;
  for(const link of linkTargets(html)){
   if(typeof get(link.file)!=="string"){
    broken.push({from:screen.file,to:link.file});
   }
  }
 }
 const seen=new Set();
 for(const item of broken){
  const key=item.from+"->"+item.to;if(seen.has(key))continue;seen.add(key);
  findings.push({severity:"critical",source:item.from,detail:"Referenced local HTML destination missing: "+item.to});
 }
 return {results,routes,checks,findings:findings.slice(0,70),
  criticalCount:findings.filter(x=>x.severity==="critical").length,
  reviewCount:findings.filter(x=>x.severity==="review").length,
  linkCount:results.reduce((sum,x)=>sum+x.links,0)};
}
export function welcomeReport(audit){
 const lines=["# 🔥 #30 Spirit of Welcome — Membership Journey Audit","",
 "Read-only GitHub source inspection. **No visitor or member data, no signup attempts, no account creation, and no calculated conversion rates.**","",
 "## Journey map: public route evidence","",
 "| Step | Static route reference | Local destination |",
 "| --- | --- | --- |"];
 for(const r of audit.routes)lines.push("| "+formatPath(r.label)+" | "+(r.present?"Present":"Not a direct anchor — review JS route")+
   " | "+(r.destination?"File exists":"Missing file")+" |");
 lines.push("","## Invitation, privacy and free/paid clarity","",
 "Configured static checks passing: **"+audit.checks.filter(x=>x.ok).length+"/"+audit.checks.length+"**.");
 for(const c of audit.checks)lines.push("- "+(c.ok?"✅":"⚠️")+" "+formatPath(c.name));
 lines.push("","## Prioritized findings","");
 if(!audit.findings.length)lines.push("- No static entry-point, route-anchor, or text-signal issues detected in scoped pages.");
 else{
  for(const f of [...audit.findings].sort((a,b)=>(a.severity==="critical"?-1:1)-(b.severity==="critical"?-1:1)).slice(0,15)){
   lines.push("- "+(f.severity==="critical"?"❌ **Check missing reference:** ":"⚠️ **Review:** ")+formatPath(f.source)+": "+formatPath(f.detail));
  }
  if(audit.findings.length>15)lines.push("- "+(audit.findings.length-15)+" additional findings omitted from summary.");
 }
 lines.push("",
 "## Founder-reviewable conversion improvements","",
 "1. **Verify first signup with a consented test account in a browser:** successful free registration, email verification if enabled, optional onboarding, dashboard, Start Here lesson and return access. A code reference is not proof that authentication works.",
 "2. **Reduce decision friction:** review whether the Join page makes its single primary free-account action immediately obvious, with a visible existing-account sign-in option and an accurate optional paid-tier explanation.",
 "3. **Keep the first lesson easy to reach:** manually test dashboard and Lessons links after authentication, including mobile navigation and accessibility. Do not add tracking to sensitive journal fields.",
 "4. **Measure appropriately:** existing PostHog collection is anonymous, cookieless **pageviews only**. Page view counts for public entry/Join/auth pages can show directional attention, but cannot establish completed registrations or a user-level funnel. Use separately authorized aggregate registration data before stating signup conversion, and update privacy documentation before adding any new events.",
 "5. **Only then consider paid upgrades:** confirm free member value first; do not introduce pressure, false urgency or ambiguous free/paid promises.",
 "",
 "## Scope and founder gates","",
 "- This audit checks "+audit.results.filter(x=>x.exists).length+" of "+SCREENS.length+" selected public-source HTML files and "+audit.linkCount+" same-origin HTML anchor occurrences; it does not simulate a real browser or exercise the Supabase or Stripe backend.",
 "- Missing direct links may be intentional JavaScript routes; the report calls them review opportunities, not demonstrated broken flows.",
 "- No member accounts, credentials, personal reflections, payments, messages, phone numbers, emails, private lessons, videos or unpublished content accessed.",
 "- No code, site copy, pricing, subscriber settings or analytics instrumentation changed by this scheduled audit.",
 "- Any proposed changes require founder review and the site's ordinary tested pull-request workflow.",
 "");
 return lines.join("\n");
}
export async function runWelcome({root=ROOT}={}){
 const readFile=name=>{
  if(!/^(?:[a-z0-9-]+\.html|js\/member-auth\.js)$/i.test(name))return null;
  const p=path.join(root,name);
  return fs.existsSync(p)?fs.readFileSync(p,"utf8"):null;
 };
 return welcomeReport(auditWelcome(readFile));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const text=await runWelcome();
  process.stdout.write(text);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,text+"\n");
 }catch(e){
  process.stderr.write("Spirit of Welcome could not inspect public site source: "+String(e.message).slice(0,100)+"\n");
  process.exitCode=1;
 }
}
