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
  assert.ok(css.includes('p.premium-prose-connector'));
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


test('the final release checklist retains independent billing and editorial approval gates', () => {
  const doc = read('FLAMEWALKER_PLUS_RELEASE_CHECKLIST.md');
  assert.match(doc, /seven approved founding lessons/i);
  assert.match(doc, /PUBLIC_CHECKOUT_UI_ENABLED=false/);
  assert.match(doc, /PUBLIC_LIVE_CHECKOUT_ENABLED=false/);
  assert.match(doc, /separate explicit approval/i);
  assert.match(doc, /28 editorial drafts/i);
});

test('the inline Imprint Map supplies four editable columns in the correct lesson section', () => {
  const html = read('member-premium-lesson.html');
  const js = read('js/member-premium-lesson.js');
  for (const id of ['premium-map-received', 'premium-map-missed', 'premium-map-learned',
    'premium-map-decision', 'premium-map-chosen-rule', 'premium-map-copy', 'premium-map-save', 'premium-map-clear']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /id="premium-father-map"[^>]*hidden/);
  assert.match(html, /not saved automatically or uploaded/);
  assert.ok(js.includes('function renderFatherMapInline(step, body, positiveInheritance)'));
  assert.ok(js.includes('if (isFatherPractice) renderFatherMapInline(step, body, onPositiveInheritance)'));
  assert.ok(js.includes("el('premium-father-map').hidden = true;"));
  assert.ok(js.includes("el('premium-pause-reflection').hidden = isFatherPractice || isStructuredPractice || final;"));
  assert.ok(html.includes('id="premium-map-grid"'));
  assert.ok(html.includes('id="premium-map-actions"'));
  assert.ok(html.includes('Read a column. Fill in its box. Then continue.'));
  assert.doesNotMatch(html, /fill in your Father Imprint Map on this page/);
  assert.match(js, /const READ_TO_ME_ENABLED = false;/);
});


test('map worksheet only saves on user request and copies all four answers', async () => {
  const vm = require('node:vm');
  const js = read('js/member-premium-lesson.js');
  const a = js.indexOf('  function fatherMapHasAnswers()');
  const z = js.indexOf('  function reflectionAnswers()', a);
  assert.ok(a > 0 && z > a);
  const handlers = {};
  const elements = {};
  for (const id of ['premium-map-received','premium-map-missed','premium-map-learned',
    'premium-map-chosen-rule','premium-map-decision','premium-map-status',
    'premium-map-copy','premium-map-save','premium-map-clear']) {
    elements[id] = {value:'',textContent:'',addEventListener(event,fn){handlers[id]=fn;}};
  }
  const flags = [{value:'Fact',checked:true}];
  let copied='',saved='';
  vm.runInNewContext(js.slice(a,z),{
    el:id=>elements[id],
    document:{querySelectorAll:()=>flags},
    navigator:{clipboard:{writeText:async x=>{copied=x;}}},
    saveReflectionToWork:x=>{saved=x;}
  });
  assert.equal(saved,'');
  elements['premium-map-received'].value='Skills';
  elements['premium-map-missed'].value='Praise';
  elements['premium-map-learned'].value='Work proves worth';
  elements['premium-map-decision'].value='REFORGE';
  elements['premium-map-chosen-rule'].value='Rest matters';
  await handlers['premium-map-copy']();
  assert.match(copied,/Skills/);
  assert.match(copied,/Praise/);
  assert.match(copied,/Work proves worth/);
  assert.match(copied,/Rest matters/);
  assert.equal(saved,'');
  handlers['premium-map-save']();
  assert.equal(saved,copied);
  handlers['premium-map-clear']();
  assert.equal(elements['premium-map-received'].value,'');
  assert.equal(flags[0].checked,false);
});


test('Father Map shows teaching on the left and the matching answer on the right across parts', () => {
  const vm = require('node:vm');
  const js = read('js/member-premium-lesson.js');
  const start = js.indexOf('  const fatherMapFields = [');
  const end = js.indexOf('  function render({ focus = false }', start);
  assert.ok(start > 0 && end > start);
  const node = label => ({
    label, className: '', children: [], parent: null,
    append(...items) {
      for (const item of items) {
        if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1);
        this.children.push(item); item.parent = this;
      }
    },
    closest() { return this.field || null; }
  });
  const fields = ['received', 'missed', 'learned', 'decision'].map((name, i) => {
    const field = node('field-' + (i+1));
    const input = node('input-' + name);
    input.value = ''; input.field = field; field.append(input);
    return {id:'premium-map-' + name, field, input};
  });
  const grid=node('grid'), parking=node('parking'),actions=node('actions'),status=node('status');
  parking.append(grid,actions,status);
  const ids={'premium-map-grid':grid,'premium-father-map':parking,'premium-map-actions':actions,'premium-map-status':status};
  for (const f of fields) { ids[f.id] = f.input; grid.append(f.field); }
  const ctx={
    el:id=>ids[id],
    document:{createElement:tag=>node(tag)},
    appendText:(target,tag,text)=>target.append(node('text:' + text))
  };
  vm.runInNewContext(js.slice(start,end),ctx);
  const rows = page => page.children.filter(n => n.className === 'premium-map-row');
  const left = row => row.children[0].children.map(n=>n.label);
  const right = row => row.children[1].children.map(n=>n.label);
  let page=node('part10');
  ctx.parkFatherMap();
  ctx.renderFatherMapInline({blocks:[{kind:'paragraph',text:'What did I receive?'}]},page,true);
  assert.equal(rows(page).length,1);
  assert.deepEqual(left(rows(page)[0]),['text:What did I receive?']);
  assert.deepEqual(right(rows(page)[0]),['field-1']);
  fields[0].input.value = 'I learned practical skills';
  page=node('part11');
  ctx.parkFatherMap();
  ctx.renderFatherMapInline({continuation:0,blocks:[
    {kind:'heading',text:'COLUMN 1 — WHAT I RECEIVED'},
    {kind:'paragraph',text:'Received examples and prompts'},
    {kind:'heading',text:'COLUMN 2 — WHAT I MISSED'},
    {kind:'paragraph',text:'Missed examples and prompts'},
    {kind:'heading',text:'COLUMN 3 — WHAT I LEARNED'},
    {kind:'paragraph',text:'Learned rule examples'}]},page,false);
  assert.equal(rows(page).length,3);
  assert.deepEqual(rows(page).map(right),[['field-1'],['field-2'],['field-3']]);
  assert.ok(left(rows(page)[1]).includes('text:Missed examples and prompts'));
  assert.equal(fields[0].input.value,'I learned practical skills');
  page=node('part12');
  ctx.parkFatherMap();
  ctx.renderFatherMapInline({continuation:1,blocks:[
    {kind:'paragraph',text:'Then mark each statement:'},
    {kind:'heading',text:'FACT INTERPRETATION PATTERN UNKNOWN'},
    {kind:'heading',text:'COLUMN 4 — WHAT I CHOOSE NOW'},
    {kind:'paragraph',text:'For each inherited rule, choose'},
    {kind:'heading',text:'EXAMPLE 1'},
    {kind:'paragraph',text:'Sample'}]},page,false);
  assert.deepEqual(rows(page).map(right),[['field-3'],['field-4']]);
  assert.ok(left(rows(page)[0]).includes('text:Then mark each statement:'));
  page=node('part13');
  ctx.parkFatherMap();
  ctx.renderFatherMapInline({continuation:2,blocks:[{kind:'heading',text:'EXAMPLE 3'}]},page,false);
  assert.deepEqual(rows(page).map(right),[['field-1'],['field-2'],['field-3'],['field-4']]);
  assert.equal(fields[0].input.value,'I learned practical skills');
});

test('father map desktop uses a two-column row and mobile stacks the panels', () => {
  const css = read('css/member-premium-lesson.css');
  const js = read('js/member-premium-lesson.js');
  assert.match(css, /premium-map-row\{/);
  assert.match(css, /grid-template-columns:minmax\(0,1\.2fr\) minmax\(300px,\.9fr\)/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(js, /body\.classList\.toggle\('premium-map-layout', isFatherPractice \|\| isStructuredPractice\)/);
  assert.match(js, /const READ_TO_ME_ENABLED = false;/);
});


test('exercise usability audit covers the 35-lesson library and preserves private release gates', () => {
  const doc = read('FLAMEWALKER_EXERCISE_USABILITY_AUDIT.md');
  const html = read('member-premium-lesson.html');
  const slugs = [...html.matchAll(/data-premium-lesson-link="([^"]+)"/g)].map(match => match[1]);
  assert.equal(slugs.length, 35);
  for (const slug of slugs) assert.ok(doc.includes('`' + slug + '`'), 'missing audit entry: ' + slug);
  assert.match(doc, /All seven now have inline workspaces/);
  assert.match(doc, /editorial_review/);
  assert.match(doc, /No changes to Stripe launch gates or disabled Read to Me/);
});


function simulatePracticeWorkspace() {
  const vm = require('node:vm');
  function node(tag='div', className='', textContent='') {
    return {
      tag,className,textContent,children:[],parent:null,events:{},value:'',checked:false,
      append(...items) {
        for(const item of items) {
          if(item.parent) item.parent.children.splice(item.parent.children.indexOf(item),1);
          this.children.push(item);item.parent=this;
        }
      },
      replaceChildren(...items) {
        for(const item of this.children)item.parent=null;
        this.children=[];
        if(items.length)this.append(...items);
      },
      addEventListener(event,fn) {this.events[event]=fn;},
      setAttribute(name,value) {this[name]=value;}
    };
  }
  const context={
    window:{},
    navigator:{clipboard:{async writeText(t){context.copied=t;}}},
    document:{createElement:tag=>node(tag),createTextNode:t=>node('text','',t)},
    copied:''
  };
  vm.runInNewContext(read('js/member-chosen-code.js'),context);
  vm.runInNewContext(read('js/member-editorial-workbooks.js'),context);
  vm.runInNewContext(read('js/member-lesson-workspaces.js'),context);
  const find=(root,test)=>{
    const out=[];
    function visit(n){if(test(n))out.push(n);for(const child of n.children||[])visit(child);}
    visit(root);return out;
  };
  const appendText=(target,tag,text)=>target.append(node(tag,'',''+text));
  return {create:context.window.NBJBPremiumWorkspaces.create,
    createEditorial:context.window.NBJBEditorialWorkbooks.create,
    editorialSlugs:context.window.NBJBEditorialWorkbooks.supportedSlugs,
    node,context,find,appendText};
}

test('maternal imprint map attaches editable columns beside manuscript and preserves values between sections', () => {
  const {create,node,find,appendText}=simulatePracticeWorkspace();
  const parking=node();
  const saved=[];
  const ws=create({slug:'mother-wound',parking,saveToWork:(text,context,status)=>{
    saved.push(text);status.textContent='Saved to My Work on this device.';
  }});
  assert.ok(ws);
  const step={title:'The Maternal Imprint Map',continuation:0,blocks:[
    {kind:'paragraph',text:'Complete the map with examples.'},
    {kind:'heading',text:'COLUMN 1 — WHAT CLOSENESS TAUGHT ME'},
    {kind:'paragraph',text:'Closeness examples.'},
    {kind:'heading',text:'COLUMN 2 — WHAT APPROVAL REQUIRED'},
    {kind:'paragraph',text:'Approval examples.'},
    {kind:'heading',text:'COLUMN 3 — WHAT ROLE I LEARNED TO PLAY'},
    {kind:'paragraph',text:'Role examples.'},
    {kind:'heading',text:'COLUMN 4 — WHAT HEALTHY CLOSENESS MEANS TO ME NOW'},
    {kind:'paragraph',text:'Chosen closeness examples.'}
  ]};
  const first=node();
  ws.park(); ws.render(step,first,appendText);
  const rows=find(first,n=>n.className==='premium-map-row');
  assert.equal(rows.length,4);
  assert.equal(find(rows[0].children[0],n=>n.textContent==='Closeness examples.').length,1);
  assert.equal(find(rows[0].children[1],n=>n.tag==='textarea').length,1);
  const firstInput=find(rows[0],n=>n.tag==='textarea')[0];
  firstInput.value='Closeness with room for privacy';
  assert.equal(saved.length,0,'never automatically save on entering values');
  ws.park();
  const last=node();
  ws.render({title:'The Maternal Imprint Map',continuation:1,blocks:[
    {kind:'paragraph',text:'KEEP REFORGE RETIRE'},
    {kind:'heading',text:'EXAMPLE 1'},
    {kind:'paragraph',text:'Worked example'}]},last,appendText);
  const review=find(last,n=>n.className==='premium-map-row');
  assert.equal(review.length,4,'later map page reviews all four fields');
  assert.equal(find(review[0],n=>n.tag==='textarea')[0],firstInput,'input object is reused, not recreated');
  assert.equal(firstInput.value,'Closeness with room for privacy');
  assert.ok(ws.serializedParts()[0].includes('Closeness with room for privacy'));
});

test('Silence Inventory and Armor Audit support editable repeatable records and explicit saves', async () => {
  const {create,node,context,find,appendText}=simulatePracticeWorkspace();
  const saved=[];
  function verify(slug,heading,expectedEntries,expectedQuestions){
    const savedBefore=saved.length;
    const ws=create({slug,parking:node(),saveToWork:(text,kind,status)=>{
      saved.push({text,kind});status.textContent='Saved to My Work on this device.';
    }});
    assert.ok(ws);
    const step={title:heading,continuation:0,blocks:[
      {kind:'paragraph',text:'Choose examples from your life.'},
      {kind:'paragraph',text:'For each, complete the questions.'}
    ]};
    const page=node(); ws.park(); ws.render(step,page,appendText);
    const rows=find(page,n=>n.className==='premium-map-row');
    assert.equal(rows.length,slug.includes('armor')?7:1);
    const picker=find(page,n=>n.tag==='select')[0];
    assert.equal(picker.children.length,expectedEntries);
    const first=find(page,n=>n.tag==='textarea');
    assert.equal(first.length,expectedQuestions);
    first[0].value='My own example';
    assert.equal(saved.length,savedBefore,'no automatic save before deliberate action');
    ws.park();
    const next=node(); ws.render({...step,continuation:1},next,appendText);
    assert.equal(find(next,n=>n.tag==='textarea')[0],first[0]);
    assert.equal(find(next,n=>n.tag==='textarea')[0].value,'My own example');
    const buttons=find(next,n=>n.tag==='button');
    const save=buttons.find(n=>n.textContent=== (slug.includes('armor') ? 'Save Full Worksheet to My Work' : 'Save to My Work'));
    const copy=buttons.find(n=>n.textContent=== (slug.includes('armor') ? 'Copy Full Worksheet' : 'Copy My Answers'));
    assert.ok(save && copy);
    save.events.click();
    assert.ok(saved.at(-1).text.includes('My own example'));
    return {ws,page:next,picker:find(next,n=>n.tag==='select')[0]};
  }
  const s=verify('learned-silence','The Silence Inventory',3,10);
  const select=s.picker;
  select.value='2';select.events.change();
  const record3=find(s.page,n=>n.tag==='textarea')[0];
  assert.notEqual(record3.value,'My own example');
  record3.value='Another situation';
  assert.equal(s.ws.serializedParts().length,2);
  const a=verify('bullying-shame-early-armor','Part 10 — The Armor Audit',1,7);
  const add=find(a.page,n=>n.tag==='button' && n.textContent==='Add another strategy')[0];
  assert.ok(add);
  add.events.click();
  assert.equal(a.picker.children.length,2,'a second strategy becomes available');
  assert.equal(find(a.page,n=>n.tag==='textarea').length,7,'only selected strategy is displayed');
  assert.ok(saved.length>=2);
});


test('Strength Model Audit continues using repeatable inherited-rule records', () => {
  const {create,node,find,appendText}=simulatePracticeWorkspace();
  for(const cfg of [
    {slug:'what-strength-looked-like',title:'Part 12 — The Six NBJB Strength Anchors',heading:'THE STRENGTH MODEL AUDIT',initial:5,fields:7}
  ]){
    const ws=create({slug:cfg.slug,parking:node(),saveToWork:()=>{}});
    assert.ok(ws);
    const step={title:cfg.title,continuation:0,blocks:[
      {kind:'paragraph',text:'Earlier chapter prose.'},
      {kind:'heading',text:cfg.heading},
      {kind:'paragraph',text:'Complete this audit.'},
      ...(cfg.slug==='what-strength-looked-like'
        ? Array.from({length:7},(_,i)=>[
            {kind:'paragraph',text:(i+1)+'. STRENGTH QUESTION '+(i+1)},
            {kind:'paragraph',text:'Answer this question '+(i+1)}
          ]).flat()
        : [])
    ]};
    assert.equal(ws.matches(step),true);
    const page=node();ws.park();ws.render(step,page,appendText);
    const rows=find(page,x=>x.className==='premium-map-row');
    assert.equal(rows.length,cfg.slug==='what-strength-looked-like'?7:1);
    assert.equal(find(page,x=>x.textContent==='Complete this audit.').length,1);
    assert.equal(find(page,x=>x.tag==='select')[0].children.length,cfg.initial);
    const answers=find(page,x=>x.tag==='textarea');
    assert.equal(answers.length,cfg.fields);
    answers[0].value='My real-life example';
    ws.park();
    const next=node();
    ws.render({title:cfg.title,continuation:1,blocks:[{kind:'paragraph',text:'Continue the audit'}]},next,appendText);
    assert.equal(find(next,x=>x.tag==='textarea')[0],answers[0]);
    assert.equal(find(next,x=>x.tag==='textarea')[0].value,'My real-life example');
  }
});

test('Chosen Manhood Code walks every manuscript question and preserves independent rule records', async () => {
  const {create,node,find,appendText,context}=simulatePracticeWorkspace();
  const saved=[];
  const ws=create({
    slug:'inherited-vs-chosen-manhood',parking:node(),
    saveToWork:()=>{throw new Error('never save a fragmented stage note');},
    saveWholeToWork:(body,title,status)=>{
      saved.push({body,title});status.textContent='Saved complete code';
    },
    getFinalResponses:()=>[{prompt:'Chosen manhood means',response:'Strength with restraint.'}]
  });
  assert.ok(ws);
  const title='Part 12 — The One-Page Chosen Manhood Code';
  const prompts={
    A:['- What is it?','- Where did I learn it?','- Why do I choose it now?'],
    B:['- Old rule','- Useful value inside it','- Cost of the old form','- Chosen rule'],
    C:['- Old rule','- What it once protected','- What it costs now','- What replaces it']
  };
  const first={title,continuation:0,blocks:[
    {kind:'paragraph',text:'This is the primary integration tool for the track.'},
    ...['A','B','C'].flatMap(key=>[
      {kind:'heading',text:'PART '+key+' — '+({A:'KEEP',B:'REFORGE',C:'RETIRE'})[key]},
      {kind:'paragraph',text:'List the inherited rules.'},
      {kind:'paragraph',text:'For each:'},
      ...prompts[key].map(q=>({kind:'paragraph',text:q}))
    ]),
    {kind:'heading',text:'PART D — BUILD'},
    {kind:'paragraph',text:'Write one personal statement for each of the six anchors:'},
    ...['Steadiness.','Direction.','Strength with restraint.','Protection with boundaries.',
      'Responsibility with self-respect.','Brotherhood and connection.']
      .map(text=>({kind:'paragraph',text})),
    {kind:'heading',text:'PART E — ACT'},
    {kind:'paragraph',text:'Choose one behavior for the next seven days.'},
    {kind:'paragraph',text:'- observable;'},
    {kind:'paragraph',text:'- realistic;'},
    {kind:'paragraph',text:'- inside your control;'},
    {kind:'paragraph',text:'- connected to one chosen principle.'},
    {kind:'heading',text:'PART F — REVIEW'},
    {kind:'paragraph',text:'After seven days, ask:'}
  ]};
  let page=node();ws.park();ws.render(first,page,appendText);
  const rows=find(page,n=>n.className==='premium-map-row');
  assert.equal(rows.length,18,'3 Keep + 4 Reforge + 4 Retire + 6 Build + 1 Act');
  for(const row of rows) {
    assert.equal(find(row.children[1],n=>n.tag==='textarea').length,1,'a writing box is beside its question');
    assert.ok(find(row.children[0],n=>n.tag==='p').length>0,'original question remains on the left');
  }
  const keepInput=find(rows[0],n=>n.tag==='textarea')[0];
  keepInput.value='Reliability learned from my grandfather';
  const pickers=find(page,n=>n.tag==='select');
  assert.equal(pickers.length,3,'Keep, Reforge and Retire have independent selectors');
  assert.equal(pickers[0].children.length,3);
  assert.equal(pickers[1].children.length,3);
  assert.equal(pickers[2].children.length,1);
  pickers[0].value='1';pickers[0].events.change();
  const keepSecond=find(rows[0],n=>n.tag==='textarea')[0];
  assert.notEqual(keepSecond,keepInput);
  keepSecond.value='Patience I choose to continue';
  pickers[0].value='0';pickers[0].events.change();
  assert.equal(find(rows[0],n=>n.tag==='textarea')[0],keepInput);
  assert.equal(keepInput.value,'Reliability learned from my grandfather');
  const reforge=find(rows[3],n=>n.tag==='textarea')[0];
  reforge.value='Never ask for help';
  const retire=find(rows[7],n=>n.tag==='textarea')[0];
  retire.value='Anger proves respect';
  const build=find(rows[11],n=>n.tag==='textarea')[0];
  build.value='Remain steady under pressure';
  const act=find(rows[17],n=>n.tag==='textarea')[0];
  act.value='Practice one calm boundary statement each day';
  assert.equal(saved.length,0,'typing and switching never automatically save');

  const next={title,continuation:1,blocks:[
    {kind:'paragraph',text:'- Did I do it?'},
    {kind:'paragraph',text:'- What got in the way?'},
    {kind:'paragraph',text:'- Which old rule returned?'},
    {kind:'paragraph',text:'- What helped?'},
    {kind:'paragraph',text:'- What needs to change?'}
  ]};
  ws.park();page=node();ws.render(next,page,appendText);
  const reviewRows=find(page,n=>n.className==='premium-map-row');
  assert.equal(reviewRows.length,5,'five seven-day Review questions have independent boxes');
  find(reviewRows[0],n=>n.tag==='textarea')[0].value='Yes, five out of seven days';
  ws.park();page=node();ws.render(first,page,appendText);
  assert.equal(find(page,n=>n.className==='premium-map-row')[0].children[1].children[0]
    .children[0].children.at(-1),keepInput,'the original Keep input is reused across navigation');
  assert.equal(keepInput.value,'Reliability learned from my grandfather');

  const pressure={title:'Part 13 — The Pressure Test',continuation:0,blocks:[
    {kind:'paragraph',text:'Choose the three states most likely to pull you backward.'},
    ...[1,2,3,4].flatMap(i=>[
      {kind:'paragraph',text:i+'. Pressure question '+i},
      {kind:'paragraph',text:'Explain and reflect on pressure '+i}
    ]),
    {kind:'paragraph',text:'EXAMPLE'},
    {kind:'paragraph',text:'A worked example of choosing restraint.'}
  ]};
  ws.park();page=node();ws.render(pressure,page,appendText);
  const pressureRows=find(page,n=>n.className==='premium-map-row');
  assert.equal(pressureRows.length,5,'the three pressure states each have a state field plus four questions');
  const pressureInput=find(pressureRows[0],n=>n.tag==='textarea')[0];
  pressureInput.value='Feeling disrespected';
  const pressureSelector=find(page,n=>n.tag==='select')[0];
  assert.equal(pressureSelector.children.length,3);
  pressureSelector.value='1';pressureSelector.events.change();
  find(pressureRows[0],n=>n.tag==='textarea')[0].value='Exhaustion';
  pressureSelector.value='0';pressureSelector.events.change();
  assert.equal(find(pressureRows[0],n=>n.tag==='textarea')[0].value,'Feeling disrespected');
  const smaller={title:'The Smaller Door',continuation:0,blocks:[
    {kind:'paragraph',text:'If the full code feels like too much, complete three lines:'},
    {kind:'paragraph',text:'“One rule I inherited was ______.”'},
    {kind:'paragraph',text:'“I choose instead ______.”'},
    {kind:'paragraph',text:'“This week I will prove that by ______.”'}
  ]};
  ws.park();page=node();ws.render(smaller,page,appendText);
  const smallRows=find(page,n=>n.className==='premium-map-row');
  assert.equal(smallRows.length,3,'the optional three-line version is also fillable');
  find(smallRows[1],n=>n.tag==='textarea')[0].value='I choose responsibility without exhaustion';
  const full=ws.completedWorksheetText();
  assert.match(full,/MY CHOSEN MANHOOD CODE/);
  for(const label of ['PART A — KEEP','PART B — REFORGE','PART C — RETIRE',
    'PART D — BUILD','PART E — ACT','PART F — REVIEW AFTER SEVEN DAYS',
    'THE PRESSURE TEST','THE SMALLER DOOR','FINAL GUIDED REFLECTION']) assert.ok(full.includes(label),label);
  for(const entry of ['Reliability learned from my grandfather','Patience I choose to continue',
    'Never ask for help','Feeling disrespected','Exhaustion','Strength with restraint.']) assert.ok(full.includes(entry),entry);
  assert.equal(saved.length,0);
  const final=node();ws.renderCompletion(final);
  const paper=find(final,n=>n.className==='premium-worksheet-paper')[0];
  assert.equal(paper.textContent,full,'complete preview matches complete document');
  const copy=find(final,n=>n.tag==='button' && n.textContent==='Copy Full Personal Code')[0];
  await copy.events.click();
  assert.equal(context.copied,full);
  const save=find(final,n=>n.tag==='button' && n.textContent==='Save Full Code to My Work')[0];
  save.events.click();
  assert.equal(saved.length,1,'one click saves exactly one complete document');
  assert.equal(saved[0].body,full,'no answers are truncated');
  assert.equal(saved[0].title,'My Chosen Manhood Code');
});

test('Chosen Manhood full worksheet is member-only with private manual saving and public checkout locked', () => {
  const loader=read('js/member-bootstrap.js');
  const reader=read('js/member-premium-lesson.js');
  const chosen=read('js/member-chosen-code.js');
  const platform=read('js/member-platform.js');
  const billing=read('js/member-billing.js');
  assert.ok(loader.includes('"premium-lesson": ["js/member-chosen-code.js", "js/member-lesson-workspaces.js", "js/member-premium-lesson.js"]'));
  assert.ok(chosen.includes('saveWholeToWork(full,'));
  assert.ok(chosen.includes('Nothing is uploaded automatically.'));
  assert.ok(platform.includes('member-full-worksheet-paper'));
  assert.match(reader,/const READ_TO_ME_ENABLED = false;/);
  assert.match(billing,/const PUBLIC_CHECKOUT_UI_ENABLED = false;/);
});



test('Shame Separation gives each of six numbered questions a side-by-side answer and carries it into the Armor Audit', () => {
  const {create,node,find,appendText}=simulatePracticeWorkspace();
  const stored=[];
  const ws=create({
    slug:'bullying-shame-early-armor',parking:node(),
    saveToWork:()=>{throw new Error('must save as a single complete worksheet instead');},
    saveWholeToWork:(body,context,status)=>{stored.push({body,context});status.textContent='Saved full worksheet';},
    getFinalResponses:()=>[{prompt:'Final learning',response:'Choose safe, measured openness.'}]
  });
  const shame={
    title:'Part 9 — The Shame Separation',continuation:0,blocks:[
      {kind:'paragraph',text:'Use this tool before the Armor Audit.'},
      ...Array.from({length:6},(_,i)=>[
        {kind:'paragraph',text:(i+1)+'. QUESTION '+(i+1)},
        {kind:'paragraph',text:'Explanation for question '+(i+1)}
      ]).flat(),
      {kind:'paragraph',text:'EXAMPLE'},
      {kind:'paragraph',text:'This is a worked example.'}
    ]
  };
  assert.equal(ws.matches(shame),true);
  const page=node();ws.park();ws.render(shame,page,appendText);
  const rows=find(page,x=>x.className==='premium-map-row');
  assert.equal(rows.length,6);
  const fields=rows.map((row,i)=>{
    assert.ok(find(row.children[0],x=>x.textContent===(i+1)+'. QUESTION '+(i+1)).length>0);
    const inputs=find(row.children[1],x=>x.tag==='textarea');
    assert.equal(inputs.length,1,'each question has its own right-hand input');
    return inputs[0];
  });
  fields.forEach((input,i)=>{input.value=('Answered shame question '+(i+1)+'. ').repeat(16);});
  assert.equal(stored.length,0,'typing never triggers storage');

  const armor={
    title:'Part 10 — The Armor Audit',continuation:0,blocks:[
      {kind:'paragraph',text:'Choose several armor strategies you recognize.'},
      {kind:'paragraph',text:'For each:'},
      ...[1,2,3,4,5].flatMap(i=>[
        {kind:'paragraph',text:i+'. ARMOR QUESTION '+i},
        {kind:'paragraph',text:'Guidance for '+i}
      ]),
      {kind:'paragraph',text:'EXAMPLE'},
      {kind:'paragraph',text:'Example of humor as armor'}
    ]
  };
  ws.park();
  assert.equal(ws.matches(armor),true);
  const armorPage=node();ws.render(armor,armorPage,appendText);
  const armorRows=find(armorPage,x=>x.className==='premium-map-row');
  assert.equal(armorRows.length,7,'one name, five source questions and one chosen-rule field');
  armorRows.forEach(row=>assert.equal(find(row.children[1],x=>x.tag==='textarea').length,1));
  const strategyInputs=armorRows.map(row=>find(row.children[1],x=>x.tag==='textarea')[0]);
  strategyInputs[0].value='Humor as protection';
  strategyInputs[1].value='I was laughed at';
  strategyInputs[6].value='I can use humor without hiding my feelings';

  const full=ws.completedWorksheetText();
  assert.ok(full.length>2400,'test ensures the completed document is larger than ordinary My Work summaries');
  assert.ok(full.includes('PART I — THE SHAME SEPARATION'));
  assert.ok(full.includes('PART II — THE ARMOR AUDIT'));
  assert.ok(full.includes('PART III — FINAL REFLECTION'));
  assert.ok(full.includes('I can use humor without hiding my feelings'));
  assert.ok(full.includes('Answered shame question 1.'));
  assert.equal(fields[0].value,('Answered shame question 1. ').repeat(16));
  const review=node();
  ws.renderCompletion(review);
  const paper=find(review,x=>x.className==='premium-worksheet-paper')[0];
  assert.ok(paper);
  assert.equal(paper.textContent,full);
  assert.equal(stored.length,0,'preview does not autosave');
  const save=find(review,x=>x.tag==='button' && x.textContent==='Save Full Worksheet to My Work')[0];
  assert.ok(save);
  save.events.click();
  assert.equal(stored.length,1,'one click stores one complete document');
  assert.equal(stored[0].body,full,'not truncated at 2,400 characters');
  assert.equal(stored[0].context,'Shame Separation & Armor Audit');

  ws.park();
  const returned=node();ws.render(shame,returned,appendText);
  assert.equal(find(returned,x=>x.tag==='textarea')[0],fields[0],
    'moving back to Shame Separation uses same input node');
});

test('Complete Armor worksheet uses full-document local storage and My Work exposes its entire content', () => {
  const reader=read('js/member-premium-lesson.js');
  const history=read('js/member-history-insights.js');
  const platform=read('js/member-platform.js');
  const service=read('js/member-service.js');
  const from=reader.indexOf('  function saveCompleteWorksheetToWork(');
  const end=reader.indexOf('  // This worksheet is optional',from);
  assert.ok(from>0 && end>from);
  const calls=[];
  const ctx={
    window:{NBJBMemberService:{recordToolEntry:(tool,entry)=>{calls.push({tool,entry});return {ok:true};}}},
    lesson:{title:'Bullying, Shame, and the Early Armor'},
    slug:'bullying-shame-early-armor',current:14
  };
  const vm=require('node:vm');
  vm.runInNewContext(reader.slice(from,end),ctx);
  const text='A'.repeat(4000)+'\n\nMY FULL ANSWERS';
  const status={textContent:''};
  ctx.saveCompleteWorksheetToWork(text,'Shame Separation & Armor Audit',status);
  assert.equal(calls.length,1);
  assert.equal(calls[0].tool,'Lesson Worksheet');
  assert.equal(calls[0].entry.data.worksheet,text);
  assert.ok(calls[0].entry.summary.length<2400);
  assert.ok(status.textContent.includes('ONE document'));
  assert.match(service,/summary: String\(payload\.summary \|\| ''\)\.slice\(0, 2400\)/);
  for(const source of [history,platform]){
    assert.match(source,/member-full-worksheet-paper/);
    assert.match(source,/entry\.data\?\.worksheet/);
    assert.match(source,/key !== 'worksheet'/);
  }
});



test('Strength Model Audit follows each numbered question and compiles one complete five-rule document', async () => {
  const {create,node,find,appendText,context}=simulatePracticeWorkspace();
  const saves=[];
  const ws=create({
    slug:'what-strength-looked-like',parking:node(),
    saveToWork:()=>{throw new Error('Strength must save one full document rather than clipped notes');},
    saveWholeToWork:(full,title,status)=>{
      saves.push({full,title});
      status.textContent='Saved one complete document';
    },
    getFinalResponses:()=>[{prompt:'Final chosen identity',response:'Steady and responsible without self-erasure'}]
  });
  const title='Part 12 — The Six NBJB Strength Anchors';
  const first={
    title,continuation:0,blocks:[
      {kind:'paragraph',text:'Use the six NBJB anchors to examine strength.'},
      {kind:'paragraph',text:'1. STEADINESS'},
      {kind:'paragraph',text:'Keep your feet under you.'},
      {kind:'heading',text:'THE STRENGTH MODEL AUDIT'},
      {kind:'paragraph',text:'Choose five inherited rules.'},
      {kind:'paragraph',text:'1. INHERITED RULE'},
      {kind:'paragraph',text:'Some examples of rules.'}
    ]
  };
  assert.equal(ws.matches(first),true);
  let page=node();
  ws.park();ws.render(first,page,appendText);
  let rows=find(page,n=>n.className==='premium-map-row');
  assert.equal(rows.length,1,'strength anchors preceding the audit must not generate fields');
  const received=find(rows[0],n=>n.tag==='textarea')[0];
  const ruleSelector=find(page,n=>n.tag==='select')[0];
  assert.equal(ruleSelector.children.length,5,'the five rules have separate persistent records');
  const firstRule=('I learned work without rest. ').repeat(7);
  received.value=firstRule;
  assert.equal(saves.length,0,'typing is not a storage action');

  const continued={title,continuation:1,blocks:[
    {kind:'paragraph',text:'Inherited rule examples continued'},
    ...[2,3,4,5,6].flatMap(i=>[
      {kind:'paragraph',text:i+'. QUESTION '+i},
      {kind:'paragraph',text:'Instructions for question '+i}
    ])
  ]};
  ws.park();page=node();ws.render(continued,page,appendText);
  rows=find(page,n=>n.className==='premium-map-row');
  assert.equal(rows.length,6,'the inherited rule continues beside its original input, followed by questions 2–6');
  assert.equal(find(rows[0],n=>n.tag==='textarea')[0],received);
  assert.equal(received.value,firstRule);
  rows.forEach((row,i)=>{
    const inp=find(row,n=>n.tag==='textarea')[0];
    assert.ok(inp,'the question has a matching input');
    if(i)inp.value=('Specific answer for question '+(i+1)+'. ').repeat(6);
  });

  const last={title,continuation:2,blocks:[
    {kind:'paragraph',text:'7. CHOSEN RULE'},
    {kind:'paragraph',text:'Rewrite your inherited rule in language you can live.'}
  ]};
  ws.park();page=node();ws.render(last,page,appendText);
  rows=find(page,n=>n.className==='premium-map-row');
  assert.equal(rows.length,1);
  const choice=find(rows[0],n=>n.tag==='textarea')[0];
  choice.value='Responsibility includes rest.';
  const selector=find(page,n=>n.tag==='select')[0];
  for(let k=1;k<5;k++){
    selector.value=String(k);selector.events.change();
    const active=find(rows[0],n=>n.tag==='textarea')[0];
    active.value=('My chosen rule '+(k+1)+'. ').repeat(10);
  }
  selector.value='0';selector.events.change();
  assert.equal(find(rows[0],n=>n.tag==='textarea')[0].value,'Responsibility includes rest.');
  assert.equal(received.value,firstRule,'switching records preserves previous responses');

  const finalText=ws.completedWorksheetText();
  assert.match(finalText,/STRENGTH MODEL AUDIT — MY CHOSEN RULES/);
  assert.match(finalText,/RULE 1/);
  assert.match(finalText,/RULE 5/);
  assert.match(finalText,/FINAL REFLECTION/);
  assert.match(finalText,/Responsibility includes rest/);
  assert.match(finalText,/Steady and responsible without self-erasure/);
  assert.equal(saves.length,0);
  const preview=node();ws.renderCompletion(preview);
  const paper=find(preview,n=>n.className==='premium-worksheet-paper')[0];
  assert.equal(paper.textContent,finalText,'final worksheet preview is complete');
  const copy=find(preview,n=>n.tag==='button' && n.textContent==='Copy Full Worksheet')[0];
  await copy.events.click();
  assert.equal(context.copied,finalText);
  const save=find(preview,n=>n.tag==='button' && n.textContent==='Save Full Worksheet to My Work')[0];
  save.events.click();
  assert.equal(saves.length,1,'one click makes one My Work document');
  assert.equal(saves[0].full,finalText);
  assert.equal(saves[0].title,'Strength Model Audit');
});

test('Strength Model Audit preserves published text, access controls, and billing locks', () => {
  const module=read('js/member-lesson-workspaces.js');
  const reader=read('js/member-premium-lesson.js');
  const billing=read('js/member-billing.js');
  assert.match(module,/strengthWorksheet = slug === 'what-strength-looked-like'/);
  assert.ok(module.includes('strengthTargets[Number(numbered[1])-1]'));
  assert.match(module,/PART II — THE ARMOR AUDIT/);
  assert.match(reader,/const READ_TO_ME_ENABLED = false;/);
  assert.match(billing,/const PUBLIC_CHECKOUT_UI_ENABLED = false;/);
});



test('Needs Permission Map places answers beside six questions and keeps both needs when switching pages', async () => {
  const {create,node,find,appendText,context}=simulatePracticeWorkspace();
  const saved=[];
  const ws=create({
    slug:'allowed-to-need',parking:node(),
    saveToWork:()=>{throw Error('Needs must save as one complete worksheet');},
    saveWholeToWork:(body,title,status)=>{saved.push({body,title});status.textContent='Saved full worksheet';},
    getFinalResponses:()=>[{prompt:'A lesson I choose',response:'Asking clearly is responsible.'}]
  });
  const title='Part 11 — Positive Inheritance';
  const part16={title,continuation:0,blocks:[
    {kind:'paragraph',text:'Who respected my needs?'},
    ...["Who met my needs well?","Who made home feel safe?","Who taught me how to ask?","Who respected my privacy?","Who comforted me without making me ashamed?","Who taught independence without abandonment?","Who let me fail and still helped me learn?","What kind of care do I want to pass forward?"].map(q=>({kind:'paragraph',text:'- '+q})),
    {kind:'heading',text:'THE NEEDS PERMISSION MAP'},
    {kind:'paragraph',text:'Choose several needs that matter to you.'},
    ...[1,2,3].flatMap(i=>[
      {kind:'paragraph',text:i+'. NEED QUESTION '+i},
      {kind:'paragraph',text:'Guidance for need question '+i}
    ])
  ]};
  assert.equal(ws.matches(part16),true);
  let page=node();ws.park();ws.render(part16,page,appendText);
  let rows=find(page,x=>x.className==='premium-map-row');
  assert.equal(rows.length,11,'eight Positive Inheritance and three Needs Map questions have answer fields');
  assert.equal(find(page,x=>x.textContent==='Who respected my needs?').length,1,'positive teaching stays outside the worksheet');
  const positiveInput=find(rows[0],x=>x.tag==='textarea')[0];
  positiveInput.value='My grandmother taught me patience.';
  for(let i=0;i<3;i++){
    const row=rows[i+8];
    assert.equal(find(row.children[0],x=>x.textContent==='Guidance for need question '+(i+1)).length,1);
    assert.equal(find(row.children[1],x=>x.tag==='textarea').length,1);
  }
  const firstInput=find(rows[8],x=>x.tag==='textarea')[0];
  firstInput.value='I need rest after hard work.';
  assert.equal(saved.length,0,'writing alone never saves private answers');
  const part17={title,continuation:1,blocks:[
    {kind:'paragraph',text:'How do I handle this need now?'},
    ...[4,5,6].flatMap(i=>[
      {kind:'paragraph',text:i+'. NEED QUESTION '+i},
      {kind:'paragraph',text:'Guidance for need question '+i}
    ]),
    {kind:'paragraph',text:'EXAMPLE'},
    {kind:'paragraph',text:'Rest is a legitimate need.'},
    {kind:'heading',text:'THE REQUEST CHECK'},
    {kind:'paragraph',text:'Before asking for support, ask:'},
    {kind:'paragraph',text:'1. What exactly am I asking for?'},
    {kind:'paragraph',text:'2. Is this a request or a demand?'}
  ]};
  ws.park();page=node();ws.render(part17,page,appendText);
  rows=find(page,x=>x.className==='premium-map-row');
  assert.equal(rows.length,6,'four need fields plus two Request Check fields');
  const selectedNeed=find(page,x=>x.tag==='select')[0];
  assert.equal(selectedNeed.children.length,2,'two independent needs can be examined');
  const question3=find(rows[0],x=>x.tag==='textarea')[0];
  assert.equal(rows[0].children[0].children[0].textContent,'3. Current Strategy — continued guidance');
  question3.value='I usually postpone rest.';
  selectedNeed.value='1';
  selectedNeed.events.change();
  const secondNeedInput=find(rows[0],x=>x.tag==='textarea')[0];
  assert.notEqual(secondNeedInput,question3,'switching needs uses different answer fields');
  secondNeedInput.value='I take short breaks.';
  selectedNeed.value='0';
  selectedNeed.events.change();
  assert.equal(find(rows[0],x=>x.tag==='textarea')[0],question3,'first need uses original input');
  assert.equal(question3.value,'I usually postpone rest.');

  const request1=find(rows[4],x=>x.tag==='textarea')[0];
  request1.value='Can we share the household tasks tonight?';
  const part18={title,continuation:2,blocks:[
    ...[3,4,5,6,7].flatMap(i=>[
      {kind:'paragraph',text:i+'. REQUEST CHECK QUESTION '+i},
      {kind:'paragraph',text:'Request check guidance '+i}
    ])
  ]};
  ws.park();page=node();ws.render(part18,page,appendText);
  rows=find(page,x=>x.className==='premium-map-row');
  assert.equal(rows.length,5,'five continuation questions each have their answer field');
  const request3=find(rows[0],x=>x.tag==='textarea')[0];
  request3.value='My partner can say no and I can still arrange support.';
  assert.ok(ws.completedWorksheetText().includes('Can we share the household tasks tonight?'));
  assert.ok(ws.completedWorksheetText().includes('My partner can say no and I can still arrange support.'));
  assert.ok(ws.completedWorksheetText().includes('I usually postpone rest.'));

  const complete=ws.completedWorksheetText();
  assert.match(complete,/NEEDS PERMISSION MAP — MY CHOSEN SUPPORT/);
  assert.match(complete,/PART I — POSITIVE INHERITANCE/);
  assert.match(complete,/My grandmother taught me patience/);
  assert.match(complete,/PART II — THE NEEDS PERMISSION MAP/);
  assert.match(complete,/NEED 1/);
  assert.match(complete,/NEED 2/);
  assert.match(complete,/PART III — THE REQUEST CHECK/);
  assert.match(complete,/PART IV — FINAL REFLECTION/);
  assert.match(complete,/Asking clearly is responsible/);
  const review=node();ws.renderCompletion(review);
  const paper=find(review,x=>x.className==='premium-worksheet-paper')[0];
  assert.equal(paper.textContent,complete);
  assert.equal(saved.length,0,'rendering the full worksheet does not save it');
  const copy=find(review,x=>x.tag==='button' && x.textContent==='Copy Full Worksheet')[0];
  await copy.events.click();
  assert.equal(context.copied,complete,'copy retains the entire document');
  const save=find(review,x=>x.tag==='button' && x.textContent==='Save Full Worksheet to My Work')[0];
  save.events.click();
  assert.equal(saved.length,1,'one click saves one complete document');
  assert.equal(saved[0].body,complete);
  assert.equal(saved[0].title,'Needs Permission Map & Request Check');
  ws.park();page=node();ws.render(part16,page,appendText);
  assert.equal(find(page,x=>x.tag==='textarea')[0].value,'My grandmother taught me patience.',
    'positive inheritance answer survives returning to an earlier section');
  assert.equal(find(page,x=>x.tag==='textarea')[8].value,'I need rest after hard work.',
    'need answer survives returning to an earlier section');
});

test('Needs lesson retains privacy, publication and checkout locks', () => {
  const source=read('js/member-lesson-workspaces.js');
  const reader=read('js/member-premium-lesson.js');
  const html=read('member-premium-lesson.html');
  const billing=read('js/member-billing.js');
  assert.match(source,/const needsWorksheet = slug === 'allowed-to-need'/);
  assert.ok(source.includes("requestTargets[index]=active.writing"));
  assert.match(source,/NEEDS PERMISSION MAP — MY CHOSEN SUPPORT/);
  assert.match(source,/My answers are personal reflection|These answers are personal reflection/);
  assert.match(reader,/const READ_TO_ME_ENABLED = false;/);
  assert.match(billing,/const PUBLIC_CHECKOUT_UI_ENABLED = false;/);
  assert.match(html,/premium-worksheet-review/);
});
