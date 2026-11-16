const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('Flamewalker Plus has a public, indexable, accessible thirty-five-lesson curriculum preview', () => {
  const html = read('flamewalker-plus.html');
  const foundation = [...html.matchAll(/data-plus-lesson data-plus-track="wounded-boy"/g)];
  const relationship = [...html.matchAll(/data-plus-lesson data-plus-track="placeholder-wound"/g)];
  assert.equal(foundation.length, 7);
  assert.equal(relationship.length, 8);
  const trust = [...html.matchAll(/data-plus-lesson data-plus-track="safe-room-courtroom"/g)];
  assert.equal(trust.length, 5);
  assert.equal([...html.matchAll(/data-plus-lesson data-plus-track="steadiness-command"/g)].length, 5);
  assert.equal([...html.matchAll(/data-plus-lesson data-plus-track="life-rebuilt"/g)].length, 5);
  assert.equal([...html.matchAll(/data-plus-lesson data-plus-track="sacred-laws"/g)].length, 5);
  assert.match(html, /id="wounded-boy"/);
  assert.match(html, /id="placeholder-wound"/);
  assert.match(html, /id="safe-room-courtroom"/);
  assert.match(html, /id="steadiness-command"/);
  assert.match(html, /id="life-rebuilt"/);
  assert.match(html, /id="sacred-laws"/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main id="main-content">/);
  assert.match(html, /rel="canonical" href="https:\/\/notbrokenjustburning\.com\/flamewalker-plus\.html"/);
  assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
  assert.match(read('sitemap.xml'), /https:\/\/notbrokenjustburning\.com\/flamewalker-plus\.html/);
});
test('the founding-preview identifies the available paid membership', () => {
  const html = read('flamewalker-plus.html');
  assert.match(html, /All six learning tracks published · Membership available/);
  assert.match(html, /All 35 guided lessons are published in the protected member library/);
  assert.match(html, /Paid checkout is available inside the authenticated member area/);
  assert.match(html, /\$14\.99/);
  assert.match(html, /\$149/);
  assert.match(html, /AI Doc Maker voiceovers are not offered/);
  assert.doesNotMatch(html, /stripe\.com|checkout\.stripe|data-requires-tier="paid"|member-premium-lesson\.html/);
  assert.match(html, /not automatically uploaded, encrypted, or synchronized/);
  assert.match(html, /does not replace licensed mental-health care/);
});
test('site visitors and signed-in members can discover the preview without a broken paid CTA', () => {
  for (const file of ['join.html','member-store.html','member-library.html','books-projects.html']) {
    assert.match(read(file), /href="flamewalker-plus\.html"/, file);
  }
  assert.match(read('join.html'), /Create Free Flamewalker Account/);
  assert.match(read('member-store.html'), /Available: 35 published lessons/);
});

test('thirty-five planned lessons are honestly presented in six distinct tracks', () => {
  const html = read('flamewalker-plus.html');
  const cards = [...html.matchAll(/data-plus-lesson data-plus-track="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(cards.filter(v=>v==="wounded-boy").length,7);
  assert.deepEqual(cards.filter(v=>v==="placeholder-wound").length,8);
  assert.deepEqual(cards.filter(v=>v==="safe-room-courtroom").length,5);
  assert.equal(cards.filter(v=>v==="steadiness-command").length,5);
  assert.equal(cards.filter(v=>v==="life-rebuilt").length,5);
  assert.equal(cards.filter(v=>v==="sacred-laws").length,5);
  assert.equal(cards.length,35);
  assert.match(html, /All 35 guided lessons are published in the protected member library/);
  assert.match(html, /All 35 guided lessons are published/);
  assert.match(html, /qualified references and clear clinical\/legal boundaries/);
  assert.match(html, /Yes\. All 35 guided written lessons are available with Flamewalker\+/);
  assert.match(read('join.html'), /Explore the thirty-five-lesson curriculum preview/);
  assert.match(html, /The Five Sacred Laws of Survival/);
  assert.match(html, /the separate Sacred Laws book is not presented as finished or for sale/);
});
