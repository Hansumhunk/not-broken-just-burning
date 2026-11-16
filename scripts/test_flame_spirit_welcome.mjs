import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {linkTargets,auditWelcome,welcomeReport,runWelcome,SCREENS,JOURNEY} from "./flame_spirit_welcome.mjs";

const gated=new Set(["member-onboarding.html","members.html","member-start-here.html",
 "member-framework.html","member-lessons.html","member-store.html"]);
function html(file,anchors=[],copy=""){
 const links=anchors.map(dest=>'<a href="'+dest+'">'+dest+'</a>').join("");
 const noindex=gated.has(file)||file==="member-auth.html"?'<meta name="robots" content="noindex,nofollow">':"";
 return '<!doctype html><html><head>'+noindex+'<title>NBJB Test</title></head><body>'+copy+links+'</body></html>';
}
function fixtures(){
 return {
  "index.html":html("index.html",["join.html"],"Discover the Path"),
  "join.html":html("join.html",["member-auth.html"],"Create a free Flamewalker account. Flamewalker+ is optional."),
  "member-auth.html":html("member-auth.html",["members.html"],
    '<form id="sign-up-form"></form><script src="js/member-auth.js"></script>'),
  "js/member-auth.js":"async function route(){return auth.signUp('example');} const target='member-onboarding.html';",
  "member-onboarding.html":html("member-onboarding.html",["members.html"],
    "Your starting snapshot stays on this browser device. Skip Setup for Now."),
  "members.html":html("members.html",["member-start-here.html","member-store.html"]),
  "member-start-here.html":html("member-start-here.html",["member-framework.html#chaos"],
    "Free lesson. Find one next honest action."),
  "member-framework.html":html("member-framework.html",["members.html"],"Free framework"),
  "member-lessons.html":html("member-lessons.html",["member-start-here.html"],
    "Access the first free lesson."),
  "member-store.html":html("member-store.html",["members.html"],"Flamewalker+ paid membership. A free option remains."),
  "flamewalker-plus.html":html("flamewalker-plus.html",["member-auth.html"],
    "Start free then consider Flamewalker+.")
 };
}
const read=files=>name=>files[name]??null;
test("Scope includes the true discovery, signup, dashboard, lesson and optional membership steps",()=>{
 assert.ok(SCREENS.some(x=>x.file==="member-onboarding.html"));
 assert.ok(JOURNEY.some(x=>x.from==="members.html"&&x.to==="member-start-here.html"));
 assert.ok(JOURNEY.some(x=>x.from==="members.html"&&x.to==="member-store.html"));
});
test("Relative and fragment hrefs map to local HTML without gathering query strings",()=>{
 const links=linkTargets('<html><body><a href="/join.html?ref=someone#start">Free</a><a href="member-framework.html#chaos">Next</a><a href="/">Home</a></body></html>');
 assert.deepEqual(links.map(x=>x.file),["join.html","member-framework.html","index.html"]);
});
test("External links, mailto, js, and anchors are not treated as on-site conversions",()=>{
 const links=linkTargets('<body><a href="https://evil.example/collect.html">External</a><a href="mailto:support@example.com">Email</a><a href="#section">Section</a><a href="javascript:alert(1)">Bad</a></body>');
 assert.equal(links.length,0);
});
test("Complete fixture passes with no claims about real authentication success",()=>{
 const audit=auditWelcome(read(fixtures()));
 assert.equal(audit.criticalCount,0);
 assert.equal(audit.reviewCount,0);
 assert.ok(audit.routes.every(x=>x.present&&x.destination));
 assert.equal(audit.checks.filter(x=>x.ok).length,audit.checks.length);
});
test("Missing landing-to-join anchor appears as a review, not proven abandonment",()=>{
 const data=fixtures();data["index.html"]=html("index.html",["resources.html"]);
 const audit=auditWelcome(read({...data,"resources.html":html("resources.html")}));
 assert.ok(audit.findings.some(f=>f.severity==="review"&&f.detail.includes("No direct anchor to join.html")));
 assert.equal(audit.criticalCount,0);
});
test("Missing HTML target is a critical reference finding",()=>{
 const data=fixtures();delete data["member-framework.html"];
 const audit=auditWelcome(read(data));
 assert.ok(audit.findings.some(f=>f.severity==="critical"&&f.detail.includes("member-framework.html")));
});
test("Broken linked file in a member hub is flagged, not followed over the network",()=>{
 const data=fixtures();
 data["members.html"]=html("members.html",["member-start-here.html","member-store.html","not-launched.html"]);
 const audit=auditWelcome(read(data));
 assert.ok(audit.findings.some(f=>f.severity==="critical"&&f.detail.includes("not-launched.html")));
});
test("Clear free/paid, optional onboarding and device-local privacy must remain visible",()=>{
 const data=fixtures();
 data["join.html"]=html("join.html",["member-auth.html"],"Join the movement.");
 data["member-onboarding.html"]=html("member-onboarding.html",["members.html"],"Setup your profile.");
 const audit=auditWelcome(read(data));
 assert.ok(audit.checks.some(x=>x.name.includes("free")&&!x.ok));
 assert.ok(audit.checks.some(x=>x.name.includes("skip")&&!x.ok));
 assert.ok(audit.checks.some(x=>x.name.includes("privacy")&&!x.ok));
});
test("Sign-up JavaScript references are checked but not mistaken for an actual signup",()=>{
 const data=fixtures();data["js/member-auth.js"]="function signUp(){}";
 const audit=auditWelcome(read(data));
 assert.ok(audit.checks.some(x=>x.name.includes("JavaScript")&&!x.ok));
 const report=welcomeReport(audit);
 assert.match(report,/code reference is not proof/i);
 assert.doesNotMatch(report,/registrations completed|signup conversion is \d+/i);
});
test("Member noindex omissions generate review flags",()=>{
 const data=fixtures();data["member-store.html"]=data["member-store.html"].replace('<meta name="robots" content="noindex,nofollow">',"");
 const audit=auditWelcome(read(data));
 assert.ok(audit.findings.some(x=>x.source==="member-store.html"&&x.detail.includes("noindex")));
});
test("Summary explicitly excludes sensitive data and unverified conversion metrics",()=>{
 const out=welcomeReport(auditWelcome(read(fixtures())));
 assert.match(out,/pageviews only/i);
 assert.match(out,/does not simulate a real browser/i);
 assert.match(out,/founder-reviewable/i);
 assert.doesNotMatch(out,/email@example.com|stripe_secret|actual paying customers increased/i);
});
test("End-to-end CLI logic runs against local fixture only; no network",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nbjb-welcome-"));
 try{
  for(const [file,contents] of Object.entries(fixtures())){
   const p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,contents);
  }
  const output=await runWelcome({root:dir});
  assert.match(output,/Spirit of Welcome/);
  assert.match(output,/Discovery → join/);
  assert.match(output,/9\/9/);
 } finally{fs.rmSync(dir,{recursive:true,force:true});}
});
