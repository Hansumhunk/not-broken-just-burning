'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {PAGES,TRACKS,scored,indexedLessons,resumeEntry}=require('../js/member-search.js');

test('Search is located immediately left of More in one protected member navigation group',()=>{
  const platform=read('js/member-platform.js');
  const search=read('js/member-search.js');
  const css=read('css/member-search.css');
  assert.match(platform,/actions\.className = 'member-nav-actions'/);
  assert.match(platform,/actions\.append\(more\)/);
  assert.match(platform,/nav\.append\(actions\)/);
  assert.match(search,/actions\.insertBefore\(toggle,more\)/);
  assert.match(search,/actions\.append\(panel\)/);
  assert.match(css,/\.member-nav-actions\s*\{/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-column:span 2/);
});
test('Signed-in bootstrap loads Search after authenticated services and member navigation',()=>{
  const boot=read('js/member-bootstrap.js');
  assert.ok(boot.indexOf('await loadScript("js/member-entitlements.js")') < boot.indexOf('await loadScript("js/member-search.js")'));
  assert.ok(boot.indexOf('await loadScript("js/member-platform.js")') < boot.indexOf('await loadScript("js/member-search.js")'));
  assert.ok(boot.indexOf('await loadScript("js/member-search.js")') < boot.indexOf('body.dataset.memberAccess = "granted"'));
  assert.match(boot,/find-resume-v1/);
  const search=read('js/member-search.js');
  assert.match(search,/if \(!auth\?\.user\?\.id \|\| !entitlements\?\.load\) return/);
});
test('Search finds lessons and tools by title, track and synonyms, without search API',()=>{
  const lessons=indexedLessons([
    {slug:'boundaries-without-cruelty',title:'Boundaries Without Cruelty',track_slug:'steadiness-command',status:'published'},
    {slug:'fatherhood-what-children-watch',title:'Fatherhood Under Pressure',track_slug:'life-rebuilt',status:'published'}
  ]);
  const all=[...PAGES,...lessons];
  assert.equal(scored(all,'boundaries')[0].title,'Boundaries Without Cruelty');
  assert.equal(scored(all,'track 5').find(x=>x.title==='Fatherhood Under Pressure')?.title,'Fatherhood Under Pressure');
  assert.equal(scored(all,'one stone')[0].title,'One Stone');
  assert.ok(scored(all,'saved work').some(x=>x.href==='member-work.html'));
});
test('Never index draft lessons, untrusted slugs or unsupported track names',()=>{
  const items=indexedLessons([
    {slug:'active-lesson',title:'Active Lesson',track_slug:'wounded-boy',status:'published'},
    {slug:'private-review',title:'Editorial Notes',track_slug:'wounded-boy',status:'editorial_review'},
    {slug:'x',title:'Unreleased',track_slug:'wounded-boy',status:'draft'},
    {slug:'../secret',title:'Danger',track_slug:'wounded-boy',status:'published'},
    {slug:'not-a-known-track',title:'Unknown',track_slug:'other',status:'published'},
    {slug:'active-lesson',title:'Duplicate',track_slug:'wounded-boy',status:'published'},
    {slug:'very-long',title:'A',track_slug:'wounded-boy',status:'published'}
  ]);
  assert.equal(items.length,1);
  assert.equal(items[0].title,'Active Lesson');
  assert.equal(items[0].href,'member-premium-lesson.html?lesson=active-lesson');
  assert.equal(Object.keys(TRACKS).length,6);
});
test('Resume link requires server-confirmed paid access and known-safe reading location',()=>{
  const meta={slug:'being-needed-vs-chosen',title:'Being Needed Is Not Being Chosen',section:3};
  assert.equal(resumeEntry(meta,false),null);
  assert.equal(resumeEntry({...meta,slug:'../../private'},true),null);
  assert.equal(resumeEntry({...meta,section:-1},true),null);
  assert.equal(resumeEntry(meta,true)?.href,'member-premium-lesson.html?lesson=being-needed-vs-chosen&section=3');
});
test('Search queries are local and no private reflection fields or billing records are indexed',()=>{
  const search=read('js/member-search.js');
  assert.match(search,/body:\{action:'catalog'\}/);
  assert.match(search,/status === 'published'/);
  assert.match(search,/input\.addEventListener\('input',render\)/);
  assert.match(search,/results\.replaceChildren\(\)/);
  assert.match(search,/textContent=entry\.title/);
  assert.doesNotMatch(search,/innerHTML|\.analytics|posthog|localStorage|sessionStorage|listEntries\(|reflectionBody|worksheetEntries/);
  assert.ok(!PAGES.some(x=>/private.*reflection/i.test(x.terms||'')));
});
test('Esc and outside click close the search panel; opening Search closes More',()=>{
  const search=read('js/member-search.js');
  assert.match(search,/if\(more\)more\.open=false/);
  assert.match(search,/if\(event\.key==='Escape'\)/);
  assert.match(search,/if\(!panel\.hidden&&!actions\.contains\(event\.target\)\)close\(\)/);
  assert.match(search,/toggle\.setAttribute\('aria-expanded','false'\)/);
  assert.match(search,/input\.focus\(\)/);
});
test('Free users see no private resume bookmark and protected lessons remain server-gated',()=>{
  const search=read('js/member-search.js');
  const lessonService=read('js/member-premium-lesson.js');
  assert.match(search,/s\?\.tier === 'paid' && s\?\.source === 'server'/);
  assert.match(search,/resumeEntry\(window\.NBJBLearningContinuity\?\.get\?\.\(\),paidAccess\(\)\)/);
  assert.match(lessonService,/read-flamewalker-lesson/);
  assert.doesNotMatch(search,/service_role|sk_live_|sb_secret_/);
});
