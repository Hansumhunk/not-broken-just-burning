const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('premium lesson reader defers access decisions to the protected server endpoint', () => {
  const js = read('js/member-premium-lesson.js');
  assert.doesNotMatch(js, /if \(tier !== 'paid'\)/);
  assert.match(js, /await auth\.client\.functions\.invoke\('read-flamewalker-lesson', \{ body: \{ slug \} \}\)/);
  assert.match(js, /const denied = error\?\.context\?\.status === 403/);
  assert.ok(js.indexOf('renderLesson(data.lesson)') < js.lastIndexOf('await loadCatalog()'), 'catalog is loaded after protected lesson authorization');
});

test('unpublished manuscript review controls remain hidden by default and never publish', () => {
  const html = read('member-premium-lesson.html');
  const js = read('js/member-premium-lesson.js');
  assert.match(html, /id="premium-editorial-review"[^>]*hidden/);
  for (const item of ['tone', 'boundaries', 'exercises', 'accuracy', 'proofreading']) {
    assert.match(html, new RegExp('id="premium-review-' + item + '"'));
  }
  assert.match(html, /id="premium-editorial-save"/);
  assert.match(html, /id="premium-editorial-copy"/);
  assert.match(html, /does not approve, unlock, charge for, or publish/);
  assert.match(js, /reviewPanel\.hidden = lesson\.status !== 'editorial_review'/);
  assert.match(js, /reviewPanel\.hidden\) hydrateEditorialReview\(\)/);
  assert.match(js, /editorialKey = userId \?/);
  assert.match(js, /record\.revision === currentRevision/);
  assert.match(js, /lesson\?\.status !== 'editorial_review'/);
  assert.doesNotMatch(js, /\.from\(['"]flamewalker_premium_lessons['"]\).*\.update\(/s);
});

test('the server only returns premium content to paid accounts or a nominated reviewer', () => {
  const backend = read('supabase/functions/read-flamewalker-lesson/index.ts');
  assert.match(backend, /withSupabase\(\{ auth: "user" \}/);
  assert.match(backend, /Deno\.env\.get\("NBJB_SANDBOX_TEST_USER_ID"\)/);
  assert.match(backend, /if \(!entitled && !isEditorialReviewer\) return reply\(\{ error: "paid_membership_required" \}, 403\)/);
  assert.match(backend, /\.eq\("status", "published"\)/);
  assert.match(backend, /\.in\("status", \["published", "editorial_review"\]\)/);
  assert.match(backend, /"Cache-Control": "private, no-store, max-age=0"/);
});

test('the reviewer checklist stores no manuscript content and can never grant entitlement', () => {
  const js = read('js/member-premium-lesson.js');
  const snippet = js.slice(js.indexOf('const editorialItems ='), js.indexOf('function exerciseStatus('));
  assert.match(snippet, /storageWrite\(editorialKey, JSON\.stringify\(draft\)\)/);
  assert.doesNotMatch(snippet, /localStorage\.setItem\([^)]*lesson\.content/);
  assert.doesNotMatch(snippet, /membership_entitlements|auth\.updateUser|\.update\(/);
  assert.match(snippet, /This does not approve or publish the lesson/);
});
