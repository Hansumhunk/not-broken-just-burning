const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('Flamewalker Plus has a public, indexable, accessible ten-lesson curriculum preview', () => {
  const html = read('flamewalker-plus.html');
  const foundation = [...html.matchAll(/data-plus-lesson data-plus-track="wounded-boy"/g)];
  const relationship = [...html.matchAll(/data-plus-lesson data-plus-track="placeholder-wound"/g)];
  assert.equal(foundation.length, 7);
  assert.equal(relationship.length, 3);
  assert.match(html, /id="wounded-boy"/);
  assert.match(html, /id="placeholder-wound"/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main id="main-content">/);
  assert.match(html, /rel="canonical" href="https:\/\/notbrokenjustburning\.com\/flamewalker-plus\.html"/);
  assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
  assert.match(read('sitemap.xml'), /https:\/\/notbrokenjustburning\.com\/flamewalker-plus\.html/);
});
test('the founding-preview copy cannot be mistaken for an active checkout', () => {
  const html = read('flamewalker-plus.html');
  assert.match(html, /Coming Soon · Editorial review/);
  assert.match(html, /None is published or for sale yet/);
  assert.match(html, /Paid checkout is closed/);
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
  assert.match(read('member-store.html'), /Planned: not for sale yet/);
});
