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

test('the private reader lists thirty-five lessons in six distinct tracks', () => {
  const html = read('member-premium-lesson.html');
  const slugs = [
    'father-wound', 'mother-wound', 'learned-silence',
    'bullying-shame-early-armor', 'what-strength-looked-like',
    'allowed-to-need', 'inherited-vs-chosen-manhood',
    'being-needed-vs-chosen', 'the-love-bargain', 'red-flags-and-responsibility',
    'betrayal-rewrite-trap', 'children-not-relationship-glue', 'loyalty-without-self-abandonment',
    'grieving-future-never-happened', 'other-person-not-your-measure',
    'promise-of-the-room', 'split-alliance-therapy-triangle', 'professional-authority-multiplier',
    'when-you-stop-trusting-own-account', 'double-bind-darvo-reaction',
    'body-as-ally', 'name-the-emotion-choose-action', 'the-space-between-trigger-and-response',
    'boundaries-without-cruelty', 'discipline-without-self-punishment',
    'provision-without-proving-worth', 'fatherhood-what-children-watch',
    'brotherhood-without-dependency', 'lead-yourself-first', 'the-integrated-man-thirty-day-map',
    'sacred-law-emotional-boundaries', 'sacred-law-pattern-recognition',
    'sacred-law-self-worth', 'sacred-law-strategic-retreat', 'sacred-law-authentic-voice'
  ];
  const links = Array.from(html.matchAll(/data-premium-lesson-link="([^"]+)"/g)).map(match => match[1]);
  assert.deepEqual(links, slugs);
  assert.match(html, /Track 1 · The Wounded Boy and Inherited Manhood/);
  assert.match(html, /Track 2 · The Placeholder Wound/);
  assert.match(html, /Track 3 · When the Safe Room Becomes the Courtroom/);
  assert.match(html, /Editorial preview: unpublished lessons are available only to the approved reviewer/);
  const js = read('js/member-premium-lesson.js');
  assert.match(js, /const tracks = \['wounded-boy', 'placeholder-wound', 'safe-room-courtroom', 'steadiness-command', 'life-rebuilt', 'sacred-laws'\]/);
  assert.match(js, /tracks\.indexOf\(a\.track_slug\)/);
  assert.match(js, /group\.className = 'premium-track-heading'/);
  assert.match(js, /Track 2 · The Placeholder Wound/);
});

test('membership and library accurately distinguish published founding lessons from drafts without opening sales', () => {
  const store = read('member-store.html');
  const library = read('member-library.html');
  const doc = read('FOUNDING_LAUNCH_RELEASE.md');
  assert.match(store, /Seven founding lessons on inherited manhood are now approved and published/);
  assert.match(store, /Seven founding lessons are published in the protected library/);
  assert.match(store, /Planned: not for sale yet/);
  assert.match(library, /Seven-Lesson Track · Enrollment Pending/);
  assert.match(library, /twenty-eight additional manuscripts remain private editorial drafts/);
  assert.match(read('flamewalker-plus.html'), /7 published · Enrollment pending/);
  assert.match(read('flamewalker-plus.html'), /Paid checkout is closed/);
  assert.match(library, /Paid membership enrollment remains closed/);
  assert.match(library, /Eight-Lesson Track · Coming Soon/);
  assert.match(library, /Five-Lesson Track · Coming Soon/);
  assert.match(doc, /All seven are present in Supabase/);
  assert.match(doc, /status = editorial_review/);
  assert.match(doc, /No source manuscript bodies were added to public GitHub/);
});

test('expanded relationship modules deliver additional guided value without gating original public education', () => {
  const store = read('member-store.html');
  const library = read('member-library.html');
  const release = read('FOUNDING_LAUNCH_RELEASE.md');
  assert.match(store, /seven on inherited manhood, eight on relationships, five on professional trust and credibility, five on emotional command, five on rebuilding life, and five on the Sacred Laws of Survival/);
  assert.match(store, /original shorter public educational articles remain available for future free use/i);
  assert.match(library, /Original shorter educational articles can remain free/);
  assert.match(release, /7 original full-length \+ 3 newly expanded = 10 substantial guided lessons/);
  assert.match(release, /All ten currently remain/);
  assert.doesNotMatch(release, /any of the seven are published/);
});

test('Track 2 copy describes expanded exercises accurately without suggesting publication', () => {
  const store = read('member-store.html');
  const library = read('member-library.html');
  const release = read('FOUNDING_LAUNCH_RELEASE.md');
  assert.match(store, /eight relationship recovery modules, each with practical exercises/);
  assert.match(store, /original shorter public educational articles remain available for future free use/i);
  assert.match(library, /eight expanded relationship modules/);
  assert.match(library, /eight guided modules now form the relationship/);
  assert.match(library, /five lessons about trust and helping processes/);
  assert.match(release, /content.version = 2/);
  assert.match(release, /status = editorial_review/);
  assert.match(release, /no Stripe checkout was enabled/);
});

test('draft editorial review queue stays inside server-authorized reader and uses true prompt counts', () => {
  const html = read('member-premium-lesson.html');
  const js = read('js/member-premium-lesson.js');
  assert.match(html, /id="premium-editorial-review"[^>]*hidden/);
  assert.match(html, /id="premium-review-queue-list"/);
  assert.match(html, /id="premium-editorial-prompt-label"/);
  assert.doesNotMatch(html, /Five reflection prompts are useful/);
  assert.match(js, /function renderReviewQueue\(\)/);
  assert.match(js, /lesson\?\.status !== 'editorial_review'/);
  assert.match(js, /reviewCatalog = items/);
  assert.match(js, /promptCount = Array.isArray\(lesson.content\?\.exercise\?\.prompts\)/);
  assert.match(js, /saved.revision === String\(lesson\?\.updated_at \|\| ''\)/);
  assert.match(js, /This is not a publication approval tally/);
});

test('Read to Me is temporarily disabled without removing the preserved voice implementation', () => {
  const js = read('js/member-premium-lesson.js');
  const html = read('member-premium-lesson.html');
  const css = read('css/member-premium-lesson.css');
  assert.doesNotMatch(html, /id="premium-recorded-audio"|id="premium-narration-player"|Natural narration/);
  assert.doesNotMatch(js, /syncRecordedAudio\(|stopRecorded\(|recordedAudio|recordedStatus/);
  assert.doesNotMatch(css, /Recorded, reusable audio is primary/);
  assert.match(html, /id="premium-voice-unavailable"/);
  assert.match(html, /id="premium-browser-voice" hidden/);
  assert.doesNotMatch(html, /id="premium-browser-voice" open/);
  assert.match(html, /id="premium-speak" disabled/);
  assert.match(html, /id="premium-speak-section" disabled/);
  assert.match(js, /const READ_TO_ME_ENABLED = false;/);
  assert.match(js, /const speech = READ_TO_ME_ENABLED &&/);
  assert.match(js, /if \(!READ_TO_ME_ENABLED \|\| !speech \|\| !steps\.length\) return;/);
  assert.match(html, /id="premium-speak"/);
  assert.match(html, /id="premium-speak-section"/);
  assert.match(html, /continues through every section/);
  assert.match(js, /function finishSpokenSection\(token\)/);
  assert.match(js, /speechMode === 'all' && current < steps.length - 1/);
  assert.match(js, /go\(current \+ 1\);\s*playSpeech\('all'\);/);
  assert.match(js, /activeUtterance = utterance/);
  assert.match(js, /window\.setTimeout\(\(\) => speakChunk\(token\), 20\)/);
  assert.match(js, /playSpeech\('section'\)/);
  assert.match(js, /playSpeech\(speechMode\)/);
  assert.doesNotMatch(js, /visibilitychange.*stopSpeech\(/);
});

test('device read-aloud advances through every section and optional exercise in a simulated speech engine', () => {
  const vm = require('node:vm');
  const source = read('js/member-premium-lesson.js');
  const first = source.indexOf('  function stopSpeech(');
  const last = source.indexOf('  function buildExercise()', first);
  assert.ok(first > 0 && last > first, 'speech functions must be discoverable');
  const speechCode = source.slice(first, last);
  const scheduled = [];
  const spoken = [];
  const speech = {
    paused: false,
    cancel() {},
    speak(utterance) {
      spoken.push(utterance.text);
      scheduled.push(() => utterance.onend());
    }
  };
  const speechControls = {
    play: { disabled: false },
    section: { disabled: false },
    pause: { disabled: true, textContent: 'Pause' },
    stop: { disabled: true }
  };
  const audioStatus = { textContent: '' };
  const context = {
    speech, speechControls, audioStatus,
    READ_TO_ME_ENABLED: true, // Exercise dormant code without exposing it in production.
    SpeechSynthesisUtterance: class {
      constructor(text) { this.text = text; }
    },
    window: { setTimeout(fn) { scheduled.push(fn); } },
    el() { return { value: '1' }; },
    label(step) { return step.title; },
    lesson: { content: { exercise: { title: 'Reflection', prompts: ['One prompt', 'Two prompts'] } } },
    steps: [
      { title: 'Opening', blocks: [{ text: 'First section for speech playback.' }] },
      { title: 'Next', blocks: [{ text: 'Second section for speech playback.' }] },
      { title: 'Guided reflection', exercise: true, blocks: [] }
    ],
    current: 0,
    run: 0,
    queue: [],
    reading: false,
    speechMode: 'all',
    activeUtterance: null
  };
  context.go = next => { context.current = next; context.stopSpeech('Ready for next section'); };
  vm.runInNewContext(speechCode, context);

  function drain() {
    let processed = 0;
    while (scheduled.length) {
      if (++processed > 100) assert.fail('speech callbacks did not settle');
      scheduled.shift()();
    }
  }
  context.playSpeech('all');
  drain();
  assert.equal(context.current, 2, 'full lesson voice reaches final guided reflection');
  assert.ok(spoken.some(chunk => chunk.includes('First section')), 'reads opening');
  assert.ok(spoken.some(chunk => chunk.includes('Second section')), 'reads next section');
  assert.ok(spoken.some(chunk => chunk.includes('One prompt')), 'reads final exercise prompts');
  assert.match(audioStatus.textContent, /Finished reading this lesson/);
  assert.equal(context.reading, false);

  context.current = 0;
  spoken.length = 0;
  context.playSpeech('section');
  drain();
  assert.equal(context.current, 0, 'section-only mode must not advance');
  assert.ok(spoken.every(chunk => !chunk.includes('Second section')));
  assert.match(audioStatus.textContent, /Section finished/);

  context.current = 0;
  context.playSpeech('all');
  const beforeStop = spoken.length;
  context.stopSpeech('Stopped');
  drain();
  assert.equal(context.current, 0, 'stop cancels pending auto-advance');
  assert.equal(spoken.length, beforeStop, 'stale speech callbacks are ignored');

  // Even with a speech engine available, the production-off flag prevents playback.
  context.READ_TO_ME_ENABLED = false;
  context.current = 0;
  spoken.length = 0;
  context.playSpeech('all');
  drain();
  assert.equal(spoken.length, 0, 'disabled Read to Me must never speak');
  assert.equal(context.current, 0, 'disabled Read to Me must not change the reader position');
});

test('AI Doc Maker recordings cannot be served by the premium lesson API', () => {
  const backend = read('supabase/functions/read-flamewalker-lesson/index.ts');
  const reader = read('js/member-premium-lesson.js');
  const html = read('member-premium-lesson.html');
  assert.match(backend, /if \(body\?\.action === "audio"\) return reply\(\{ available: false, error: "narration_paused" \}, 410\)/);
  assert.doesNotMatch(backend, /createSignedUrl\(/);
  assert.doesNotMatch(reader, /syncRecordedAudio\(|premium-recorded-audio|AI Doc Maker/);
  assert.doesNotMatch(html, /AI Doc Maker|aidocmaker\.com|premium-recorded-audio|premium-audio-credit/);
  assert.match(html, /id="premium-speak"/);
});

test('every protected founding lesson link is unique across six tracks', () => {
  const html = read('member-premium-lesson.html');
  const links = [...html.matchAll(/data-premium-lesson-link="([^"]+)"/g)].map(m => m[1]);
  assert.equal(links.length, 35);
  assert.equal(new Set(links).size, 35);
  assert.match(html, /Review the thirty-five founding lessons/);
  const script = read('js/member-premium-lesson.js');
  assert.match(script, /'safe-room-courtroom'/);
  assert.match(script, /Track 3 · When the Safe Room Becomes the Courtroom/);
});

test('new practical tracks appear in private reader and editorial queue without checkout access', () => {
  const html = read('member-premium-lesson.html');
  const js = read('js/member-premium-lesson.js');
  for (const slug of ['body-as-ally','name-the-emotion-choose-action','the-space-between-trigger-and-response','boundaries-without-cruelty','discipline-without-self-punishment','provision-without-proving-worth','fatherhood-what-children-watch','brotherhood-without-dependency','lead-yourself-first','the-integrated-man-thirty-day-map']) {
    assert.match(html, new RegExp('data-premium-lesson-link="'+slug+'"'));
  }
  assert.match(js, /Track 4 · Steadiness & Emotional Command/);
  assert.match(js, /Track 5 · Rebuilding a Life That Holds/);
  assert.match(html, /Thirty-five-lesson editorial review queue/);
  assert.match(read('member-store.html'), /Seven founding lessons are published in the protected library/);
});

test('the recovered Sacred Laws remain private, correctly ordered, and awaiting founder approval', () => {
  const html = read('member-premium-lesson.html');
  const js = read('js/member-premium-lesson.js');
  const doc = read('FOUNDING_35_EDITORIAL_GATE.md');
  const slugs = ['sacred-law-emotional-boundaries','sacred-law-pattern-recognition','sacred-law-self-worth','sacred-law-strategic-retreat','sacred-law-authentic-voice'];
  for (const slug of slugs) assert.match(html, new RegExp('data-premium-lesson-link="'+slug+'"'));
  assert.match(js, /Track 6 · The Five Sacred Laws of Survival/);
  assert.match(html, /Thirty-five-lesson editorial review queue/);
  assert.match(read('member-store.html'), /Seven founding lessons are published in the protected library/);
  assert.match(doc, /35 drafts · 6 tracks · 0 published/);
  assert.match(doc, /Founding content scope is frozen/);
});


test('short rhetorical connector blocks render as compact prose without changing text', () => {
  const js = read('js/member-premium-lesson.js');
  const css = read('css/member-premium-lesson.css');
  assert.match(js, /premium-prose-connector/);
  assert.match(css, /p\\.premium-prose-connector/);
  assert.match(js, /const READ_TO_ME_ENABLED = false;/);
});

test('live subscription UI is prepared but closed until explicit final launch approval', () => {
  const html = read('member-store.html');
  const js = read('js/member-billing.js');
  const bootstrap = read('js/member-bootstrap.js');
  const validator = read('scripts/validate_site.py');
  assert.match(html, /id="member-live-billing"[^>]*hidden/);
  assert.match(html, /id="member-billing-consent"/);
  assert.match(html, /data-live-billing-offer="flamewalker_plus_monthly"/);
  assert.match(html, /data-live-billing-offer="flamewalker_plus_annual"/);
  assert.match(html, /id="member-billing-portal"/);
  assert.match(html, /href="terms\.html"/);
  assert.match(html, /href="refunds\.html"/);
  assert.match(js, /const PUBLIC_CHECKOUT_UI_ENABLED = false;/);
  assert.match(js, /if \(!PUBLIC_CHECKOUT_UI_ENABLED\) return;/);
  assert.match(js, /const MIN_PUBLISHED_LESSONS = 7;/);
  assert.match(js, /item\?\.status === 'published'/);
  assert.match(js, /'create-live-checkout-session'/);
  assert.match(js, /'create-live-customer-portal-session'/);
  assert.match(js, /url\.protocol === 'https:' && url\.hostname === expected/);
  assert.match(js, /entitlements\.refresh\(\)/);
  assert.match(js, /if \(params\.get\('checkout'\) === 'success'\)/);
  assert.ok(js.indexOf("if (params.get('checkout') === 'success')") < js.lastIndexOf('purchase.hidden = false;'), 'redirect handling prevents a second purchase');
  assert.match(bootstrap, /store: \["js\/member-billing\.js"\]/);
  assert.match(validator, /"js\/member-billing\.js"/);
  assert.doesNotMatch(js, /sk_live_|rk_live_|STRIPE_LIVE_SECRET_KEY/);
});

test('deployed live checkout source requires a real published library before Stripe customer creation', () => {
  const source = read('launch-backend-staging/create-live-checkout-session/index.ts');
  assert.match(source, /NBJB_LIVE_BILLING_MODE/);
  assert.match(source, /const PUBLIC_LIVE_CHECKOUT_ENABLED = false;/);
  assert.match(source, /\(!PUBLIC_LIVE_CHECKOUT_ENABLED \|\| launchMode !== "public"\)/);
  assert.match(source, /flamewalker_premium_lessons/);
  assert.match(source, /count: "exact", head: true/);
  assert.match(source, /\.eq\("status", "published"\)/);
  assert.match(source, /publishedLessons < 7/);
  assert.match(source, /premium_library_not_ready/);
  assert.ok(source.indexOf('publishedLessons < 7') < source.indexOf('stripe.customers.create('),
    'content availability must be checked before customer creation');
});
