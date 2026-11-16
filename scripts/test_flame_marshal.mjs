import test from "node:test";
import assert from "node:assert/strict";
import { classifyRun, classifySchedule, reviewRuns, renderReport } from "./flame_marshal.mjs";

const NOW=Date.parse("2026-11-16T16:00:00Z");
function run(name,branch,status,conclusion,created,event="pull_request",extra={}){
  return {name,head_branch:branch,status,conclusion,created_at:created,event,html_url:"https://github.com/acme/site/actions/runs/123",...extra};
}
const recent="2026-11-16T15:00:00Z";
const earlier="2026-11-16T14:00:00Z";

test("Green rerun supersedes historical red X for the same open PR",()=>{
  const data=reviewRuns({
    workflowRuns:[
      run("Validate static site","fix/a","completed","failure",earlier),
      run("Validate static site","fix/a","completed","success",recent)],
    pulls:[{number:7,head:{ref:"fix/a"}}],now:NOW
  });
  assert.equal(data.prs.length,0);
  assert.ok(!data.findings.some(f=>f.message.includes("PR #7")));
});

test("Latest failed open PR check is flagged with correct branch",()=>{
  const data=reviewRuns({
    workflowRuns:[
      run("Validate static site","fix/a","completed","success",earlier),
      run("Validate static site","fix/a","completed","failure",recent)],
    pulls:[{number:8,head:{ref:"fix/a"}}],now:NOW
  });
  assert.equal(data.prs.length,1);
  assert.match(data.findings.map(x=>x.message).join("\n"),/Open PR #8/);
});

test("Old failures on closed PRs don't trigger alarms",()=>{
  const data=reviewRuns({
    workflowRuns:[run("Validate static site","fix/merged","completed","failure",recent)],
    pulls:[],now:NOW
  });
  assert.equal(data.prs.length,0);
});

test("Latest successful Pages run replaces previously cancelled deployment",()=>{
  const data=reviewRuns({workflowRuns:[
    run("pages build and deployment","main","completed","cancelled",earlier,"dynamic"),
    run("pages build and deployment","main","completed","success",recent,"dynamic")],now:NOW
  });
  assert.equal(data.byName.find(i=>i.job.key==="pages").current.severity,"ok");
});

test("A running validation is not incorrectly marked as failed",()=>{
  const latest=run("Validate static site","main","in_progress",null,recent,"push");
  assert.equal(classifyRun(latest,NOW).severity,"progress");
  assert.equal(classifyRun({...latest,created_at:"2026-11-16T11:00:00Z"},NOW).severity,"warn");
});

test("Newly scheduled spirit with no scheduled runs waits without red X",()=>{
  const state=classifySchedule([],{state:"active",created_at:"2026-11-15T16:00:00Z"},5,NOW);
  assert.equal(state.severity,"progress");
  assert.equal(state.label,"Awaiting first schedule");
});

test("Missed schedule is a warning, not a claimed confirmed outage",()=>{
  const state=classifySchedule(
    [run("Flame Spirits Mission Control","main","completed","success","2026-11-09T12:00:00Z","schedule")],
    {state:"active",created_at:"2026-09-01T16:00:00Z"},5,NOW
  );
  assert.equal(state.severity,"warn");
  assert.equal(state.label,"Possibly overdue");
});

test("A disabled scheduled workflow is explicitly flagged",()=>{
  const state=classifySchedule([],{state:"disabled_manually",created_at:recent},9,NOW);
  assert.equal(state.severity,"alert");
});

test("Missing API evidence is unverified rather than a fabricated green status",()=>{
  const report=reviewRuns({workflowRuns:[],pulls:[],metas:{},metadataComplete:false,openPRsVerified:false,now:NOW});
  const output=renderReport(report,{now:NOW,errors:["Workflow run history unavailable"]});
  assert.match(output,/unverified/i);
  assert.doesNotMatch(output,/all systems healthy|fully operational/i);
});

test("Report does not leak unsafe GitHub run URLs into Markdown",()=>{
  const report=reviewRuns({workflowRuns:[
    run("Validate static site","main","completed","success",recent,"push",{html_url:"https://evil.example/stolen"})
  ],now:NOW});
  const output=renderReport(report,{now:NOW});
  assert.doesNotMatch(output,/evil\.example/);
  assert.match(output,/run link unavailable/);
});
