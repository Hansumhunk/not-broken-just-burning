// No account, real API calls or browser automation needed for these isolated checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { guidanceFor, GUIDANCE } = require('../js/before-you-send.js');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('before-you-send.html'), script = read('js/before-you-send.js');

test('each of four choices produces a complete, non-diagnostic human-scale next step', () => {
  assert.deepEqual(Object.keys(GUIDANCE).sort(), ['boundary','facts','parenting','pause']);
  for (const key of Object.keys(GUIDANCE)) {
    const r = guidanceFor(key);
    for (const field of ['title','why','template','next','caution']) {
      assert.ok(typeof r[field] === 'string' && r[field].length > 20, key + '.' + field);
    }
    assert.match(r.next, /Next action:/);
  }
  assert.equal(guidanceFor('not-a-real-choice'), null);
  assert.equal(guidanceFor('__proto__'), null);
});

test('no private text intake, browser persistence or outbound transfer from tool', () => {
  assert.equal((page.match(/type="radio" name="purpose"/g) || []).length, 4);
  assert.doesNotMatch(page, /name="email"|type="email"|<form\b|type="submit"|\bform=/i);
  assert.match(page, /<fieldset class="bys-options" disabled>/);
  assert.match(page, /data-tool-run disabled/);
  assert.match(page, /id="bys-fallback"/);
  assert.match(script, /run\.addEventListener\('click'/);
  assert.ok(script.indexOf('run.disabled = false') > script.indexOf("run.addEventListener('click'"));
  assert.doesNotMatch(script, /\blocalStorage\b|\bsessionStorage\b|\bfetch\s*\(|XMLHttpRequest|sendBeacon|posthog|URLSearchParams|document\.cookie|innerHTML/);
  assert.match(script, /heading\.textContent = response\.title/);
  assert.match(script, /wording\.value = response\.template/);
});

test('visitor gets free optional continuation and safe public share link', () => {
  assert.match(page, /href="join\.html" data-growth-cta="before_send"/);
  const growth=read('js/main.js');
  assert.match(growth, /'home_hero','home_lessons','join_signup','before_send'/);
  assert.match(growth, /'home_hero', 'home_lessons', 'join_signup', 'before_send'/);
  assert.match(page, /href="join\.html"/);
  assert.match(page, /href="first-seven-days\.html"/);
  assert.match(page, /href="support\.html"/);
  assert.match(page, /href="privacy\.html"/);
  assert.match(page, /id="bys-share"/);
  assert.match(script, /copyValue\('https:\/\/notbrokenjustburning\.com\/before-you-send\.html'/);
  assert.match(page, /id="bys-status"[^>]+aria-live="polite"/);
  assert.match(page, /id="bys-result-heading" tabindex="-1"/);
});

test('site routes and SEO are prepared for controlled release', () => {
  const home=read('index.html'), resources=read('resources.html'), divorce=read('divorce-recovery.html');
  for (const p of [home,resources,divorce]) assert.match(p, /href="before-you-send\.html"/);
  assert.match(page, /<link rel="canonical" href="https:\/\/notbrokenjustburning\.com\/before-you-send\.html"/);
  assert.match(page, /meta name="robots" content="index,follow/);
  assert.match(read('sitemap.xml'), /before-you-send\.html/);
});
