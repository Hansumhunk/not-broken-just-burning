import test from 'node:test';import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';import{createRequire}from'node:module';const require=createRequire(import.meta.url);
const{buildFather,buildIdentity}=require('../js/frontier-engine-tools.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tools=[['fatherhood-stability-planner.html','fe-father-form'],['identity-rebuild-compass.html','fe-identity-form']];
const guides=['guide-before-sending-angry-text.html','guide-fatherhood-routines-after-separation.html','guide-rebuilding-identity-after-divorce.html'];
test('combinations produce valid actionable results and reject unexpected choices',()=>{
 for(const m of ['morning','handoff','apart','bedtime'])for(const n of ['calm','connection','predictability'])for(const t of ['5','15','30']){const s=buildFather(m,n,t);assert.ok(s.includes('MY FATHERHOOD ANCHOR'));assert.ok(s.includes(t+' minutes'));}
 for(const v of ['steadiness','integrity','connection','courage'])for(const a of ['self','work','relationships'])for(const t of ['5','15','30']){const s=buildIdentity(v,a,t);assert.ok(s.includes('MY IDENTITY COMPASS'));assert.ok(s.includes('For '+t+' minutes'));}
 for(const fn of [buildFather,buildIdentity]){assert.equal(fn('__proto__','work','5'),null);assert.equal(fn('constructor','work','5'),null);assert.equal(fn(null,null,null),null);}
});
test('public tools require no user text or account and include safe guidance',()=>{
 for(const [p,id]of tools){const h=read(p);assert.ok(h.includes('id="'+id+'"'));assert.match(h,/href="join\.html"/);assert.match(h,/href="support\.html"/);assert.match(h,/href="privacy\.html"/);assert.match(h,/href="first-seven-days\.html/);assert.match(h,/aria-live="polite"/);assert.doesNotMatch(h,/<input[^>]+type="(?:text|email|password)"/i);assert.match(h,/name="minutes"/);assert.match(h,/<textarea[^>]+readonly/);}
 const js=read('js/frontier-engine-tools.js');assert.doesNotMatch(js,/\blocalStorage\b|\bsessionStorage\b|\bfetch\s*\(|XMLHttpRequest|sendBeacon|posthog|URLSearchParams|document\.cookie|innerHTML/);assert.match(js,/output\.value=text/);
});
test('distinct search pages have metadata, real content and their relevant tool CTA',()=>{
 const targets=['before-you-send.html','fatherhood-stability-planner.html','identity-rebuild-compass.html'];
 for(let i=0;i<guides.length;i++){let h=read(guides[i]);assert.match(h,/<title>/);assert.match(h,/<h1>/);assert.ok((h.match(/<h2>/g)||[]).length>=5);assert.ok(h.includes('href="'+targets[i]+'"'));assert.ok(h.includes('href="join.html"'));assert.ok(h.includes('href="support.html"'));assert.match(h,/rel="canonical"/);assert.match(h,/property="og:image"/);assert.ok(h.length>3500);}
 const resources=read('resources.html'),sitemap=read('sitemap.xml');
 for(const p of [...tools.map(x=>x[0]),...guides]){assert.ok(resources.includes('href="'+p+'"')||p.startsWith('guide-'),p+' navigation');assert.ok(sitemap.includes('https://notbrokenjustburning.com/'+p),p+' sitemap');}
});
test('frontier source does not change protected site controls',()=>{
 const css=read('css/frontier-engine.css');assert.match(css,/@media\(max-width:800px\)/);assert.match(css, /prefers-reduced-motion/);
 const a=read('.github/workflows/validate-site.yml');assert.match(a,/node --test scripts\/test_frontier_engine\.mjs/);
});

test('native form submission is structurally impossible even before JS initialization',()=>{
 for(const [p] of tools){const h=read(p);assert.doesNotMatch(h,/<form\b|type="submit"|\bform=/i);assert.equal((h.match(/<fieldset disabled>/g)||[]).length,3);assert.match(h,/data-tool-run disabled/);assert.match(h,/-fallback" role="status"/);}
 const js=read('js/frontier-engine-tools.js');assert.match(js,/run\.addEventListener\('click'/);assert.ok(js.indexOf('run.disabled=false')>js.indexOf("run.addEventListener('click'"));
});
