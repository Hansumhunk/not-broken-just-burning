/**
 * Flame Marshal (#28) — read-only GitHub Actions supervisor.
 * Checks current workflow outcomes, open PR blockers, and late schedules.
 * Reports only public workflow metadata. Never posts/issues/pushes/sends.
 *
 * Run on GitHub Actions: node scripts/flame_marshal.mjs
 * Tests: node --test scripts/test_flame_marshal.mjs
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const WORKFLOWS = Object.freeze([
  { key:"site", name:"Validate static site", file:"validate-site.yml", cadence:null },
  { key:"pages", name:"pages build and deployment", file:null, cadence:null },
  { key:"spirits", name:"Flame Spirits Mission Control", file:"flame-spirits.yml", cadence:5 },
  { key:"products", name:"Flame Spirit Product Opportunity Scout", file:"flame-spirit-products.yml", cadence:9 },
  { key:"reach", name:"Spirit of Reach Growth Briefs", file:"flame-spirit-reach.yml", cadence:9 }
]);
const LOOKBACK_MS=48*3600*1000;
const STALL_MS=120*60*1000;
const safe=s=>String(s??"").replace(/[|<>\r\n\`[\]]/g," ").slice(0,140);
const formatUTC=s=>s ? new Date(s).toISOString().replace("T"," ").replace(/\.\d+Z$/," UTC") : "unknown";
const time=s=>{const d=Date.parse(s||"");return Number.isFinite(d)?d:0};
const sorted=rs=>[...rs].sort((a,b)=>time(b.created_at)-time(a.created_at));
const workflowMatches=(r,job)=>r?.name===job.name;
const commitStatus=r=> r?.status==="completed" ? (r.conclusion||"unverified") : r?.status||"unverified";
const safeRunLink=r=> {
  const u=r?.html_url;
  try { const url=new URL(u);if(url.hostname==="github.com" && url.pathname.startsWith("/"))return url.href; }
  catch {}
  return null;
};
const showRun=r=>safeRunLink(r)? "[view run]("+safeRunLink(r)+")" : "run link unavailable";

export function classifyRun(run, now=Date.now()){
  if(!run)return {label:"Unverified",severity:"unknown",detail:"No accessible workflow runs"};
  if(run.status!=="completed") {
    if(now-time(run.created_at)>STALL_MS) return {label:"Possibly stalled",severity:"warn",detail:"Run has remained "+safe(run.status)+" for over two hours"};
    return {label:"Running or queued",severity:"progress",detail:"Newer run has not completed"};
  }
  if(run.conclusion==="success") return {label:"Passed",severity:"ok",detail:"Latest completed run succeeded"};
  if(run.conclusion==="failure"||run.conclusion==="timed_out"||run.conclusion==="action_required")
    return {label:"Needs attention",severity:"alert",detail:"Latest run "+safe(run.conclusion)};
  if(run.conclusion==="cancelled")return {label:"Cancelled",severity:"warn",detail:"May have been replaced by another run; not automatically a failed deployment"};
  return {label:"Unverified",severity:"unknown",detail:"Run ended as "+safe(run.conclusion)};
}

export function classifySchedule(runs, meta, cadenceDays, now=Date.now()){
  if(meta?.state && meta.state!=="active")
    return {label:"Disabled",severity:"alert",detail:"Workflow state: "+safe(meta.state)};
  if(!cadenceDays)return null;
  const scheduled=sorted(runs.filter(r=>r.event==="schedule"));
  const last=scheduled[0];
  if(last) {
    const age=now-time(last.created_at);
    if(age>cadenceDays*86400000)
      return {label:"Possibly overdue",severity:"warn",detail:"Last scheduled run: "+formatUTC(last.created_at)+"; check GitHub scheduling history"};
    return {label:"Schedule observed",severity:"ok",detail:"Last scheduled run: "+formatUTC(last.created_at)};
  }
  const created=time(meta?.created_at);
  if(created && now-created>cadenceDays*86400000)
    return {label:"Possibly overdue",severity:"warn",detail:"No scheduled run found within the fetched history; check workflow settings and history"};
  return {label:"Awaiting first schedule",severity:"progress",detail:"No scheduled run observed; newly created workflow may not have reached its first window"};
}

export function reviewRuns({workflowRuns=[],pulls=[],metas={},now=Date.now(),metadataComplete=true,openPRsVerified=true}={}){
  const findings=[];
  const all=sorted(workflowRuns);
  const byName=WORKFLOWS.map(job=>{
    const matching=all.filter(r=>workflowMatches(r,job));
    const main=matching.filter(r=>r.head_branch==="main");
    const latest=main[0];
    const current=classifyRun(latest,now);
    const schedule=classifySchedule(matching,metas[job.key],job.cadence,now);
    if(current.severity==="alert"||current.severity==="warn") findings.push({severity:current.severity,message:job.name+": "+current.detail});
    if(schedule?.severity==="warn"||schedule?.severity==="alert")
      findings.push({severity:schedule.severity,message:job.name+": "+schedule.detail});
    return {job,latest,current,schedule};
  });
  const prs=[];
  if(openPRsVerified){
    const branchHeads=new Map(pulls.map(p=>[p.head?.ref,p]).filter(([branch])=>typeof branch==="string"));
    for(const [branch,pr] of branchHeads){
      const recent=all.filter(r=>r.event==="pull_request" && r.head_branch===branch && now-time(r.created_at)<=LOOKBACK_MS);
      const latestByWorkflow=new Map();
      for(const run of recent){
        if(!latestByWorkflow.has(run.name))latestByWorkflow.set(run.name,run);
      }
      for(const run of latestByWorkflow.values()){
        if(!WORKFLOWS.some(w=>w.name===run.name))continue;
        const status=classifyRun(run,now);
        if(status.severity==="alert"){
          const item={number:pr.number,branch:safe(branch),name:run.name,run,detail:status.detail};
          prs.push(item);findings.push({severity:"alert",message:"Open PR #"+pr.number+" ("+safe(branch)+") "+safe(run.name)+": "+status.detail});
        }
      }
    }
  }
  return {byName,prs,findings,verified:metadataComplete&&openPRsVerified};
}

function renderStatus(s){const icon={ok:"✅",alert:"❌",warn:"⚠️",progress:"⏳",unknown:"❔"}[s.severity];return icon+" "+s.label;}
export function renderReport(report,{now=Date.now(),errors=[]}={}){
  const lines=["# 🔥 Flame Marshal — NBJB Automation Supervisor","",
    "Checked: "+new Date(now).toISOString(),"",
    "**Scope:** GitHub Actions only. This does not independently validate Stripe, Supabase, Metricool, or private ChatGPT task runs.",
    "Reports come from public repository workflow metadata. Historical red Xs remain in GitHub after newer fixes pass.", "",
    "## Current default-branch workflows","",
    "| Workflow | Current state | Latest main run | Schedule |",
    "| --- | --- | --- | --- |"];
  for(const item of report.byName) {
    const run=item.latest;
    const current=renderStatus(item.current);
    const when=run ? formatUTC(run.created_at)+" · "+showRun(run) : "No main run observed in fetched history";
    const schedule=item.schedule ? renderStatus(item.schedule)+" — "+item.schedule.detail : "Event-driven";
    lines.push("| "+safe(item.job.name)+" | "+safe(current)+" | "+when+" | "+safe(schedule)+" |");
  }
  lines.push("","## Unresolved warnings and failures","");
  if(report.findings.length===0)lines.push("- No currently unresolved alerts observed within the inspected run history.");
  else for(const f of report.findings.slice(0,15))lines.push("- "+(f.severity==="alert"?"❌":"⚠️")+" "+safe(f.message));
  if(report.findings.length>15)lines.push("- Additional "+(report.findings.length-15)+" findings omitted from this compact report.");
  lines.push("","## Open pull requests — current failed checks","");
  if(!report.verified && errors.length)lines.push("- Some GitHub sources were unavailable; PR or workflow status may be **unverified**.");
  else if(!report.prs.length)lines.push("- No latest failed checks found for accessible, open pull requests in the last 48 hours.");
  for(const p of report.prs.slice(0,10))lines.push("- PR #"+p.number+" — "+safe(p.name)+": "+safe(p.detail)+" · "+showRun(p.run));
  lines.push("","## Interpretation","",
    "- **Green check:** that run passed. **Red X:** that run failed. A later successful run does not erase the old icon.",
    "- **Cancelled** is shown separately: newer changes can supersede deployments.",
    "- **Possibly overdue** is a scheduling review flag, not proof that GitHub missed an expected run.",
    "- A report marked unverified needs a source check before drawing conclusions.",
    "- No code merged, production settings changed, private records read, customer messages sent, or money spent.", "");
  if(errors.length){lines.push("## Source limitations","");for(const err of errors)lines.push("- "+safe(err));lines.push("");}
  return lines.join("\n");
}

async function githubJson(repo,path,token){
  const url="https://api.github.com/repos/"+repo+path;
  const result=await fetch(url,{
    headers:{"Accept":"application/vnd.github+json","User-Agent":"NBJB-Flame-Marshal/1.0",
      "Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"},
    signal:AbortSignal.timeout(10000)
  });
  if(!result.ok) throw Error("GitHub API "+result.status+" for requested workflow metadata");
  return await result.json();
}

async function main(){
  const repo=process.env.GITHUB_REPOSITORY;
  const token=process.env.GITHUB_TOKEN;
  if(!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) || !token) {
    process.stderr.write("Flame Marshal requires GITHUB_REPOSITORY and a read-only GITHUB_TOKEN.\n");
    process.exitCode=1;return;
  }
  const errors=[],workflows=[],metas={};
  try{
    // Two short pages handle bursts of PR activity without unbounded API traffic.
    for(let page=1;page<=2;page++){
      const data=await githubJson(repo,"/actions/runs?per_page=100&page="+page,token);
      workflows.push(...(Array.isArray(data.workflow_runs)?data.workflow_runs:[]));
      if((data.workflow_runs||[]).length<100)break;
    }
  }catch(e){errors.push("Workflow run history unavailable ("+safe(e.message)+")");}
  let pulls=[],openPRsVerified=true;
  try{
    const data=await githubJson(repo,"/pulls?state=open&per_page=100",token);
    if(!Array.isArray(data))throw Error("Unexpected open PR response");
    pulls=data;
    if(pulls.length===100){errors.push("Open-PR list may be truncated to 100 entries");openPRsVerified=false;}
  }catch(e){errors.push("Open PR status unavailable ("+safe(e.message)+")");openPRsVerified=false;}
  for(const job of WORKFLOWS.filter(j=>j.cadence)){
    try{metas[job.key]=await githubJson(repo,"/actions/workflows/"+job.file,token);}
    catch(e){errors.push(job.name+" schedule metadata unavailable ("+safe(e.message)+")");}
  }
  const report=reviewRuns({workflowRuns:workflows,pulls,metas,openPRsVerified,
    metadataComplete:errors.length===0&&workflows.length>0});
  const rendered=renderReport(report,{errors});
  console.log(rendered);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,rendered+"\n");
  if(report.findings.length)console.log("::warning::Flame Marshal found "+report.findings.length+" workflow issue(s); see job summary.");
  if(errors.length)console.log("::warning::Flame Marshal has unverified GitHub source(s); see job summary.");
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
