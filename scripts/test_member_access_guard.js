const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const memberPages = [
  'member-community.html','member-feedback.html','member-library.html','member-lessons.html','member-media.html','member-onboarding.html',
  'member-path.html','member-path-stage.html','member-premium-lesson.html','member-profile.html','member-progress.html',
  'member-settings.html','member-start-here.html','member-framework.html','member-store.html','member-tools.html',
  'member-work.html','member-workshop.html','members.html'
];

test('all member pages fail closed before session verification', () => {
  for (const file of memberPages) {
    const html = read(file);
    assert.match(html, /id="nbjb-member-access-gate"/, file);
    assert.match(html, /body\[data-member-page\]:not\(\[data-member-access="granted"\]\) main\{display:none!important\}/, file);
    assert.match(html, new RegExp('<script src="js/member-bootstrap[.]js(?:[?][^"]*)?"></script>'), file);
    assert.doesNotMatch(html, /<body\b[^>]*data-member-access="granted"/, file + ' cannot be initially granted');
  }
  assert.doesNotMatch(read('member-auth.html'), /id="nbjb-member-access-gate"/);
});

function simulate({ userId = '', restoredUserId = '', refreshError = false } = {}) {
  let user = userId ? { id: userId } : null;
  const events = new Map();
  const redirects = [];
  const loaded = [];
  let reloads = 0;
  let subscription = null;
  let refreshCount = 0;

  const auth = {
    ready: Promise.resolve({ user }),
    get user() { return user; },
    onChange(callback) {
      subscription = callback;
      callback({ user });
      return () => { subscription = null; };
    },
    async refresh() {
      refreshCount++;
      if (refreshError) throw new Error('Network error');
      if (restoredUserId) user = { id: restoredUserId };
      return { user };
    }
  };

  const body = {
    dataset: { memberPage: 'work' },
    appendChild(node) {
      loaded.push(node.src.split('?')[0]); // Versioned assets still have the same authorized load path.
      queueMicrotask(() => node.onload?.());
    },
    insertBefore() {}
  };
  const document = {
    body,
    querySelector: () => null,
    createElement: () => ({
      src: '', onload: null, onerror: null, setAttribute() {},
      appendChild() {}, style: {}
    })
  };
  const window = {
    NBJBAuth: auth,
    NBJBLearningContinuity: { render() {} },
    addEventListener: (event, listener) => events.set(event, listener)
  };
  const location = {
    pathname: '/member-work.html', search: '', hash: '',
    replace(url) { redirects.push(url); },
    reload() { reloads++; }
  };
  vm.runInNewContext(read('js/member-bootstrap.js'), {
    document, window, location, console
  });
  return {
    body, events, redirects, loaded,
    setUser(id) {
      user = id ? { id } : null;
      subscription?.({ user });
    },
    changeStoredUser(id) { user = id ? { id } : null; },
    refreshCount: () => refreshCount,
    reloads: () => reloads
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 35));

test('signed-out direct visit redirects without loading archived work', async () => {
  const state = simulate();
  await settle();
  assert.equal(state.body.dataset.memberAccess, undefined);
  assert.equal(state.loaded.length, 0);
  assert.deepEqual(state.redirects, ['member-auth.html?next=member-work.html']);
});

test('signed-in member sees work only after authenticated initialization', async () => {
  const state = simulate({ userId: 'member-1' });
  assert.equal(state.body.dataset.memberAccess, undefined);
  await settle();
  assert.equal(state.body.dataset.memberAccess, 'granted');
  assert.ok(state.loaded.includes('js/member-service.js'));
  assert.ok(state.loaded.includes('js/member-platform.js'));
  assert.deepEqual(state.redirects, []);
});

test('sign-out while the member page is open immediately hides and redirects', async () => {
  const state = simulate({ userId: 'member-1' });
  await settle();
  assert.equal(state.body.dataset.memberAccess, 'granted');
  state.setUser(null);
  assert.equal(state.body.dataset.memberAccess, undefined);
  assert.deepEqual(state.redirects, ['member-auth.html?next=member-work.html']);
});

test('browser Back cannot reveal a previous page after logout', async () => {
  const state = simulate({ userId: 'member-1' });
  await settle();
  assert.equal(state.body.dataset.memberAccess, 'granted');
  state.events.get('pagehide')();
  assert.equal(state.body.dataset.memberAccess, undefined);
  state.changeStoredUser(null); // a logout happened in another tab
  state.events.get('pageshow')({ persisted: true });
  await settle();
  assert.equal(state.body.dataset.memberAccess, undefined);
  assert.deepEqual(state.redirects, ['member-auth.html?next=member-work.html']);
});

test('browser Back on a valid session revalidates and reloads', async () => {
  const state = simulate({ userId: 'member-1' });
  await settle();
  state.events.get('pagehide')();
  state.events.get('pageshow')({ persisted: true });
  await settle();
  assert.deepEqual(state.redirects, []);
  assert.equal(state.reloads(), 1);
  assert.equal(state.body.dataset.memberAccess, undefined);
});

test('auth check error keeps member contents hidden', async () => {
  const state = simulate({ userId: 'member-1', refreshError: true });
  await settle();
  assert.equal(state.body.dataset.memberAccess, undefined);
  assert.equal(state.loaded.length, 0);
  assert.equal(state.body.dataset.memberBootstrap, 'failed');
});

test('successful logout clears the in-memory member identity', () => {
  const code = read('js/nbjb-auth.js');
  assert.match(code, /const result = await client.auth.signOut\(\)/);
  assert.match(code, /if \(!result.error\) \{[\s\S]*currentUser = null;[\s\S]*emit\(\)/);
});

test('early-release navigation has explicit sign out and honest planned-feature labels', () => {
  const script = read('js/member-platform.js');
  assert.match(script, /signOut\.textContent = 'Sign Out'/);
  assert.match(script, /window\.NBJBAuth\.signOut\(\)/);
  assert.match(script, /window\.location\.replace\('member-auth.html'\)/);
  assert.match(script, /'Circle · Soon'/);
  assert.match(script, /'Watch · Soon'/);
  const style = read('css/members.css');
  assert.match(style, /\.member-subnav button\.member-sign-out/);
  const library = read('member-library.html');
  assert.match(library, /Video Lessons · Coming Soon/);
  assert.match(library, /href="member-tools.html">Open the Toolbox/);
  assert.doesNotMatch(library, /href="member-media.html">View paid video layer/);
  const dashboard = read('members.html');
  assert.match(dashboard, /member-feedback[.]html[?]page=dashboard/);
  assert.match(dashboard, /Please do not send personal journal entries/);
});

test('production migration removes RLS-bypassing authenticated privileges from member tables', () => {
  const sql = read('supabase/migrations/20261105200137_revoke_unsafe_member_table_privileges.sql');
  assert.match(sql, /REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE/);
  for (const table of [
    'learning_progress','member_continue_state','member_path_progress',
    'member_path_state','member_preferences','profiles'
  ]) {
    assert.ok(sql.includes('public.'+table),table+' must be protected');
  }
  assert.match(sql, /FROM authenticated;/);
  assert.doesNotMatch(sql, /\b(?:DELETE FROM|TRUNCATE TABLE|DROP TABLE)\b/i);
});


function simulateAuthVerifier({ storedId = 'member-1', verifiedId = storedId, verifyError = null } = {}) {
  const events = [];
  const session = storedId ? { user: { id: storedId, email: 'member@example.test' }, access_token: 'synthetic' } : null;
  let getUserCalls = 0;
  const client = {
    auth: {
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { return { data: { session }, error: null }; },
      async getUser() {
        getUserCalls++;
        return verifyError
          ? { data: { user: null }, error: new Error(verifyError) }
          : { data: { user: verifiedId ? { id: verifiedId, email: 'member@example.test' } : null }, error: null };
      }
    }
  };
  const window = {
    NBJBConfig: { supabaseUrl: 'https://example.supabase.test', supabasePublishableKey: 'test-only' },
    supabase: { createClient() { return client; } },
    dispatchEvent(event) { events.push(event); }
  };
  const CustomEvent = class { constructor(name, options) { this.type = name; this.detail = options.detail; } };
  vm.runInNewContext(read('js/nbjb-auth.js'), {
    window, CustomEvent, location: { origin: 'https://notbrokenjustburning.com' },
    console, Set, Promise, Error
  });
  return { auth: window.NBJBAuth, events, getUserCalls: () => getUserCalls };
}

test('member session refresh validates restored identity against Supabase Auth server', async () => {
  const v = simulateAuthVerifier();
  const result = await v.auth.refresh();
  assert.equal(result.user.id, 'member-1');
  assert.equal(result.session.user.id, 'member-1');
  assert.ok(v.getUserCalls() >= 1);
  assert.equal(v.auth.user.id, 'member-1');
});

test('invalid or mismatched cached sessions never grant device-scoped member access', async () => {
  for (const scenario of [
    { storedId: 'member-1', verifiedId: 'different-member' },
    { storedId: 'member-1', verifiedId: null },
    { storedId: 'member-1', verifyError: 'Auth server unavailable' }
  ]) {
    const v = simulateAuthVerifier(scenario);
    await assert.rejects(v.auth.refresh(), /Session identity verification failed|Auth server unavailable/);
    assert.equal(v.auth.user, null);
    assert.equal(v.auth.session, null);
  }
});

test('a signed-out user skips network user verification and stays signed out', async () => {
  const v = simulateAuthVerifier({ storedId: null });
  const result = await v.auth.refresh();
  assert.equal(result.user, null);
  assert.equal(result.session, null);
  assert.equal(v.getUserCalls(), 0);
});

test('account sign-in, signup and recovery preserve password whitespace exactly', async () => {
  const handlers = new Map();
  const calls = [];
  const form = id => ({
    addEventListener(name, fn) { handlers.set(id + ':' + name, fn); }
  });
  const inputs = {
    'sign-in-email': { value: ' member@example.com ' },
    'sign-in-password': { value: '  secret pass  ' },
    'sign-up-email': { value: ' new@example.com ' },
    'sign-up-password': { value: ' trailing space  ' },
    'new-password': { value: ' new pass ' },
    'new-password-confirm': { value: ' new pass ' },
    'magic-email': { value: '' },
    'recovery-email': { value: '' }
  };
  const elements = {
    '#auth-status': { textContent: '', dataset: {} },
    '#signed-in-state': { hidden: true },
    '#signed-out-state': { hidden: false },
    '#recovery-state': { hidden: true },
    '#sign-in-form': form('sign-in-form'),
    '#sign-up-form': form('sign-up-form'),
    '#magic-link-form': form('magic-link-form'),
    '#recovery-form': form('recovery-form'),
    '#new-password-form': form('new-password-form'),
    '#sign-out-button': form('sign-out-button'),
    '[data-auth-email]': { textContent: '' },
    '[data-auth-primary-link]': { href: '' }
  };
  const auth = {
    onChange(fn) { fn({ user: null }); },
    async signIn(...args) { calls.push(['signIn', ...args]); return { error: null }; },
    async signUp(...args) { calls.push(['signUp', ...args]); return { data: { session: null }, error: null }; },
    async updatePassword(...args) { calls.push(['updatePassword', ...args]); return { error: null }; }
  };
  const document = {
    querySelector: selector => elements[selector] || null,
    getElementById: id => inputs[id] || null
  };
  const location = { search: '?mode=recovery', hash: '', href: '' };
  const history = { replaceState() {} };
  vm.runInNewContext(read('js/member-auth.js'), {
    window: { NBJBAuth: auth }, document, location, history, URLSearchParams, Set
  });
  const submit = async name => {
    const handler = handlers.get(name + ':submit');
    assert.ok(handler, name + ' handler is installed');
    await handler({ preventDefault() {} });
  };
  await submit('sign-in-form');
  await submit('sign-up-form');
  // A password update is not permitted without verified recovery identity.
  await submit('new-password-form');
  assert.equal(calls.filter(call => call[0] === 'updatePassword').length, 0);
  auth.user = { id: 'synthetic-recovery-user' };
  auth.refresh = async () => ({user: auth.user});
  elements['#recovery-state'].hidden = false;
  await submit('new-password-form');
  assert.deepEqual(calls, [
    ['signIn', 'member@example.com', '  secret pass  '],
    ['signUp', 'new@example.com', ' trailing space  '],
    ['updatePassword', ' new pass ']
  ]);
});

test('member dashboard accurately reflects paid or free authenticated tier after release', () => {
  const dashboard = read('members.html');
  const entitlements = read('js/member-entitlements.js');
  assert.ok(dashboard.includes('Current access · <span data-member-tier-label>'));
  assert.ok(dashboard.includes('<div class="member-status"><span data-member-tier-label>'));
  assert.ok(!dashboard.includes('<span>Free Account</span>'));
  assert.ok(!dashboard.includes('Flamewalker+ comes later'));
  assert.ok(dashboard.includes('View Membership Plans'));
  assert.ok(entitlements.includes("document.querySelectorAll('[data-member-tier-label]')"));
  assert.ok(entitlements.includes('tierLabel(current.tier)'));
});


test('Lessons is a direct top-nav destination on authenticated member pages', () => {
  const platform = read('js/member-platform.js');
  const bootstrap = read('js/member-bootstrap.js');
  const dashboard = read('members.html');
  const intro = read('member-start-here.html');
  const library = read('member-library.html');
  const premium = read('member-premium-lesson.html');
  assert.ok(platform.includes("['lessons', 'member-lessons.html', 'Lessons']"));
  assert.ok(platform.includes("['start-here', 'framework', 'premium-lesson'].includes(page)"));
  assert.ok(bootstrap.includes("src === 'js/member-platform.js'"));
  assert.ok(bootstrap.includes("src + '?v=member-path-v1'"));
  for (const html of [dashboard, intro, library, premium]) {
    assert.ok(html.includes('href="member-lessons.html"'), 'members should have direct lessons navigation');
    const expected = html === premium ? 'grounded-cues-v24' : html === dashboard ? 'dashboard-returning-v2' : 'lessons-hub-v14';
    assert.ok(html.includes('js/member-bootstrap.js?v=' + expected), 'member nav script must use fresh revision');
  }
  assert.ok(dashboard.includes('Browse All Lessons'));
  assert.ok(intro.includes('Browse All Lessons'));
  assert.ok(premium.includes('All Lessons'));
});

test('Lessons hub shows free entry and dynamically grants published lessons only after server catalog confirmation', () => {
  const html = read('member-lessons.html');
  const slugs = ['father-wound','mother-wound','learned-silence','bullying-shame-early-armor','what-strength-looked-like','allowed-to-need','inherited-vs-chosen-manhood'];
  assert.ok(html.includes('data-member-page="lessons"'));
  assert.ok(html.includes('id="nbjb-member-access-gate"'));
  assert.ok(html.includes('href="member-start-here.html"'));
  assert.equal((html.match(/data-paid-lesson-open hidden/g) || []).length, 7);
  assert.equal((html.match(/data-free-lesson-lock hidden/g) || []).length, 7);
  for (const slug of slugs) assert.ok(html.includes('href="member-premium-lesson.html?lesson=' + slug + '"'));
  assert.ok(html.includes('All 44 guided lessons are now available.'));
  assert.ok(html.includes('Video lessons remain shelved'));
  assert.ok(html.includes("memberState?.tier === 'paid' && memberState?.source !== 'server_error'"));
  assert.ok(html.includes("item.status !== 'published'"));
  assert.ok(html.includes("card.dataset.publicationStatus = 'published'"));
  assert.ok(html.includes("link.hidden = !paid || (card && card.dataset.publicationStatus !== 'published')"));
  assert.ok(html.includes("functions.invoke('read-flamewalker-lesson'"));
  assert.ok(html.includes('window.addEventListener(\'nbjb:entitlements\''));
  assert.ok(html.includes('member-store.html'));
  assert.ok(!html.includes('data-premium-lesson-content'), 'premium manuscripts must never be embedded in index');
});

test('paid member Library exposes all six published track links, free members none', () => {
  const library = read('member-library.html');
  assert.equal((library.match(/data-paid-lessons-link hidden/g) || []).length, 6);
  assert.ok(library.includes("document.querySelectorAll('[data-paid-lessons-link]').forEach"));
  assert.ok(library.includes("state?.tier === 'paid' && state?.source !== 'server_error'"));
  for (const slug of ['being-needed-vs-chosen','promise-of-the-room','body-as-ally','provision-without-proving-worth','sacred-law-emotional-boundaries']) {
    assert.ok(library.includes('member-premium-lesson.html?lesson=' + slug + '"'));
  }
});

test('published Lessons cards have no decorative availability ribbons', () => {
  const catalog = read('member-lessons.html');
  const cards = catalog.match(/class="member-locked-card is-live" aria-labelledby="lesson-/g) || [];
  assert.equal(cards.length, 7);
  assert.ok(catalog.includes('body[data-member-page="lessons"] .member-locked-card::after{display:none!important;content:none!important}'));
  assert.ok(catalog.includes('All 44 guided lessons are now available.'));
});

test('all 37 additional lessons appear in five tracks and only unlock after protected publication', () => {
  const catalog = read('member-lessons.html');
  assert.equal((catalog.match(/data-editorial-preview=/g) || []).length, 37);
  assert.equal((catalog.match(/class="lesson-track-preview"/g) || []).length, 5);
  for (const [track, count] of [
    ['The Placeholder Wound', 8],
    ['When the Safe Room Becomes the Courtroom', 14],
    ['Steadiness &amp; Emotional Command', 5],
    ['Rebuilding a Life That Holds', 5],
    ['The Five Sacred Laws of Survival', 5],
  ]) {
    assert.ok(catalog.includes(track), 'missing draft track: ' + track);
  }
  assert.equal((catalog.match(/data-paid-lesson-open hidden/g) || []).length, 7);
  assert.ok(catalog.includes("item.status === 'published'"));
  assert.ok(catalog.includes('Video lessons remain shelved'));
  assert.ok(catalog.includes("link.href = 'member-premium-lesson.html?lesson=' + encodeURIComponent(item.slug)"));
  assert.ok(catalog.includes("card.dataset.publicationStatus = 'published'"));
});

test('paid dashboard learning continues into published written lessons, not unreleased video area', () => {
  const code = read('js/member-dashboard.js');
  assert.ok(code.includes("link.href = 'member-lessons.html'"));
  assert.ok(code.includes("link.textContent = 'Browse My Lessons'"));
  assert.ok(!code.includes("link.textContent = 'Open Watch & Learn'"));
});


test('available member cards use plain labels without diagonal ribbons', () => {
  const css = read('css/member-expansion.css');
  const library = read('member-library.html');
  const lessons = read('member-lessons.html');
  assert.ok(css.includes('.member-locked-card.is-live::after'));
  assert.ok(css.includes('content: none;'));
  assert.ok(css.includes('display: none;'));
  assert.ok(library.includes('class="member-locked-card is-live"><span class="member-lock-label">Flamewalker+ · Published'));
  assert.ok(lessons.includes('css/member-expansion.css?v=clean-ribbons-v17'));
  assert.ok(library.includes('css/member-expansion.css?v=clean-ribbons-v17'));
});

test('founding editorial gate reports current seven published and 28 private drafts', () => {
  const doc = read('FOUNDING_35_EDITORIAL_GATE.md');
  assert.ok(doc.includes('Current production status'));
  assert.ok(doc.includes('7 published, 28 in editorial review'));
  assert.ok(doc.includes('founder signoff tied to each final manuscript revision'));
});


test('Start Here makes the five decision stages and all six Path choices actually navigable', () => {
  const intro = read('member-start-here.html');
  const framework = read('member-framework.html');
  const pathPage = read('member-path.html');
  const startScript = read('js/member-start-here.js');
  const platform = read('js/member-platform.js');
  const bootstrap = read('js/member-bootstrap.js');
  const css = read('css/member-expansion.css');

  for (const stage of ['chaos','clarity','agency','action','integration']) {
    assert.ok(intro.includes('href="member-framework.html#' + stage + '"'), stage + ' must open a real deep dive');
    assert.match(framework, new RegExp('id="' + stage + '"'), stage + ' must have an on-page destination');
    assert.match(framework, new RegExp('framework-title-' + stage), stage + ' must contain teaching');
  }
  assert.match(framework, /data-member-page="framework"/);
  assert.match(framework, /id="nbjb-member-access-gate"/);
  assert.ok(framework.includes('js/member-bootstrap.js?v=lessons-hub-v14'));
  assert.ok(platform.includes("['start-here', 'framework', 'premium-lesson'].includes(page)"));
  assert.match(css, /\.member-lesson-flow a\s*\{/);

  const stages = [
    ['Fire Reclamation', 'fire-reclamation'],
    ["The Guardian's Path", 'guardian'],
    ['Sacred Mirror Work', 'sacred-mirror'],
    ['Masculine Restoration', 'masculine-restoration'],
    ['Voice of Fire', 'voice-of-fire'],
    ['Circle of the Flame', 'circle-of-flame']
  ];
  for (const [name, anchor] of stages) {
    assert.ok(intro.includes('name="start-here-focus" value="' + name + '"'), name + ' must be selectable');
    assert.ok(pathPage.includes('id="path-focus-' + anchor + '"'), name + ' must have a landing target');
    assert.ok(startScript.includes("'path-focus-" + anchor + "'"), name + ' must link to target');
  }
  assert.ok(intro.includes('id="start-here-choose-focus"'));
  assert.ok(intro.includes('id="start-here-focus-status"'));
  assert.ok(startScript.includes('service.setFocus(choice.value)'));
  assert.ok(startScript.includes("window.location.assign('member-path.html#' + pathIds[choice.value])"));
  assert.ok(pathPage.includes('id="member-focus-deep-dive"'));
  assert.ok(platform.includes('deepDive.href = deepDiveHref'));
  assert.ok(bootstrap.includes('target?.scrollIntoView'));
  assert.ok(intro.includes('id="start-here-next-lesson"'));
  assert.ok(startScript.includes("entitlement?.tier === 'paid' && entitlement?.source === 'server'"));
  assert.ok(startScript.includes("nextLesson.href = 'member-premium-lesson.html?lesson=father-wound'"));
  assert.ok(intro.includes('Continue to the Next Lesson: Understanding Chaos'));
  assert.ok(intro.includes('Browse All Lessons'));
});

test('Start Here focus selection saves only on explicit continue and routes to selected Path card', () => {
  const source = read('js/member-start-here.js');
  const listeners = {};
  const choices = ['Fire Reclamation',"The Guardian's Path",'Sacred Mirror Work','Masculine Restoration','Voice of Fire','Circle of the Flame'].map(value => ({
    value, checked:false, addEventListener(kind,cb){listeners[value+':'+kind]=cb;}, focus() {}
  }));
  const state={journey:{focus:''}};
  const saves=[], navigations=[];
  const focusStatus={textContent:'',dataset:{}};
  const next={href:'member-framework.html#chaos',textContent:'Continue to the Next Lesson: Understanding Chaos →'};
  const elements={
    '#start-here-form':null,'#start-here-facts':null,'#start-here-feelings':null,
    '#start-here-control':null,'#start-here-status':null,'#start-here-clear':null,
    '#start-here-focus-status':focusStatus,
    '#start-here-choose-focus':{addEventListener(kind,cb){listeners['choose:'+kind]=cb;}},
    '#start-here-next-lesson':next
  };
  const context={
    window:{location:{assign:url=>navigations.push(url)},
      NBJBMemberService:{load:()=>state,setFocus:value=>{saves.push(value);state.journey.focus=value;return{ok:true,data:state};}},
      NBJBEntitlements:{load:()=>({tier:'paid',source:'server'})}},
    document:{
      querySelector:key=>elements[key]||null,
      querySelectorAll:key=>key==='input[name="start-here-focus"]'?choices:[]
    }
  };
  vm.runInNewContext(source,context);
  assert.equal(saves.length,0,'rendering must not silently set the focus');
  assert.equal(navigations.length,0);
  assert.equal(next.href,'member-premium-lesson.html?lesson=father-wound');
  listeners['choose:click']();
  assert.equal(saves.length,0,'clicking without a choice must not save');
  assert.equal(navigations.length,0,'clicking without a choice must stay on page');
  choices[4].checked=true;
  listeners['choose:click']();
  assert.deepEqual(saves,['Voice of Fire']);
  assert.deepEqual(navigations,['member-path.html#path-focus-voice-of-fire']);
});

test('Start Here offers free deep dive, not a protected lesson URL, without a paid entitlement', () => {
  const source=read('js/member-start-here.js');
  const next={href:'member-framework.html#chaos',textContent:'Continue to the Next Lesson: Understanding Chaos →'};
  const context={window:{NBJBMemberService:{load:()=>({journey:{focus:''}})},NBJBEntitlements:{load:()=>({tier:'free',source:'server'})}},
    document:{querySelector:key=>key==='#start-here-next-lesson'?next:null,querySelectorAll:()=>[]}};
  vm.runInNewContext(source,context);
  assert.equal(next.href,'member-framework.html#chaos');
  assert.match(next.textContent,/Chaos/);
});

test('public acquisition entry points are live and report anonymous signup interest', () => {
  const home=read('index.html');
  const join=read('join.html');
  const main=read('js/main.js');
  assert.ok(home.includes('data-growth-cta="home_hero"'));
  assert.ok(home.includes('data-growth-cta="home_lessons"'));
  assert.ok(join.includes('data-growth-cta="join_signup"'));
  assert.ok(home.includes('44 published written lessons') || home.includes('44 guided lessons'));
  assert.ok(home.includes('href="join.html"'));
  assert.ok(join.includes('href="member-auth.html"'));
  assert.ok(!home.includes('Flamewalker accounts, Flamewalker+, expanded curriculum'));
  assert.ok(!home.includes('<span>BEING BUILT</span>'));
  assert.ok(main.includes("nbjb_free_membership_cta_clicked"));
  assert.ok(main.includes("window.posthog?.capture?."));
  assert.ok(main.includes("!privacySignalEnabled"));
  assert.ok(main.includes("autocapture: false"));
  assert.ok(main.includes("cookieless_mode: 'always'"));
});
test('a paid member with a protected reading bookmark is returning, not first-run', () => {
  const js=read('js/member-dashboard.js');
  const start=js.indexOf('  function isFirstRun(state, entries, entitlementState) {');
  const end=js.indexOf('  function renderContinue(state) {',start);
  assert.ok(start>=0 && end>start);
  let bookmarkCalls=0;
  const sandbox={window:{NBJBLearningContinuity:{get:()=>{bookmarkCalls++;return {
    slug:'father-wound',title:'The Father Wound',section:12,total:23
  };}}}};
  const isFirstRun=vm.runInNewContext(js.slice(start,end)+'\nisFirstRun',sandbox,{timeout:1000});
  const newMember={journey:{onboardingComplete:false,focus:'',nextAction:'',lastTool:''}};
  assert.equal(isFirstRun(newMember,[],{tier:'paid',source:'server'}),false,
    'an already-reading paid member must see the returning journey, not onboarding');
  assert.equal(bookmarkCalls,1);
  assert.equal(isFirstRun(newMember,[],{tier:'free',source:'server'}),true,
    'a free member with no journey data still sees first-run setup');
  assert.equal(isFirstRun(newMember,[],{tier:'paid',source:'server_error'}),true,
    'unverified browser tier cannot unlock paid reading history');
  assert.equal(bookmarkCalls,1,'the free/error cases must not inspect paid reading metadata');
  assert.equal(isFirstRun({journey:{...newMember.journey,focus:'Fire Reclamation'}},[],{tier:'free',source:'server'}),false);
  sandbox.window.NBJBLearningContinuity.get=()=>null;
  assert.equal(isFirstRun(newMember,[],{tier:'paid',source:'server'}),true,
    'genuinely new paid members without saved activity can still receive orientation');
  assert.ok(js.includes('renderFirstRun(state, entries, entitlementState)'));
  assert.ok(js.includes("window.addEventListener('nbjb:entitlements', render)"));
});
test('live Terms and Refund pages describe currently available paid membership without changing founding safeguards', () => {
  const terms=read('terms.html');
  const refunds=read('refunds.html');
  for(const [name,page] of [['terms',terms],['refunds',refunds]]) {
    assert.ok(page.includes('Flamewalker+ paid subscriptions are available now.'),name);
    assert.ok(page.includes('44 currently published written lessons'),name);
    assert.ok(!page.includes('paid subscriptions are not yet available for purchase'),name);
    assert.ok(!page.includes('Applies to paid memberships when offered'),name);
    assert.ok(page.includes('notbrokenjustburning@gmail.com'),name);
    assert.ok(page.includes('14'),name);
    assert.ok(page.includes('30'),name);
  }
  assert.ok(terms.includes('$14.99 USD per month'));
  assert.ok(terms.includes('$149 USD per year'));
  assert.ok(refunds.includes('$14.99/month'));
  assert.ok(refunds.includes('$149/year'));
  assert.match(refunds,/7 calendar days after the renewal charge/);
  assert.match(terms,/your free account to cancel a paid subscription/);
  assert.match(refunds,/Stripe's Customer Portal/);
});
test('Membership page gives paid subscribers account management instead of another purchase pitch', () => {
  const html=read('member-store.html');
  const js=read('js/member-billing.js');
  const bootstrap=read('js/member-bootstrap.js');
  assert.equal((html.match(/data-membership-upgrade hidden/g)||[]).length,6);
  assert.ok(html.includes('data-membership-paid-overview hidden'));
  assert.ok(html.includes('href="member-lessons.html">Open My 44 Lessons</a>'));
  assert.ok(html.indexOf('id="member-live-billing"') < html.indexOf('Simple access model'));
  assert.ok(html.includes('js/member-bootstrap.js?v=paid-account-view-v1'));
  assert.ok(bootstrap.includes("src === 'js/member-billing.js'"));
  assert.ok(bootstrap.includes("src + '?v=paid-account-view-v1'"));
  const start=js.indexOf('  function showMembershipView(current) {');
  const end=js.indexOf('  function paidThroughText(current) {',start);
  assert.ok(start>=0 && end>start,'view selector must be present');
  function scenario(){
    const overview={hidden:true};
    const upsells=Array.from({length:6},()=>({hidden:true}));
    const ctxt={paidOverview:overview,upgradeSections:upsells};
    const fn=vm.runInNewContext(js.slice(start,end)+'\nshowMembershipView',ctxt,{timeout:1000});
    return {overview,upsells,fn};
  }
  const paid=scenario();
  assert.equal(paid.fn({tier:'paid',source:'server'}),true);
  assert.equal(paid.overview.hidden,false);
  assert.ok(paid.upsells.every(node=>node.hidden));
  const free=scenario();
  assert.equal(free.fn({tier:'free',source:'server'}),false);
  assert.equal(free.overview.hidden,true);
  assert.ok(free.upsells.every(node=>!node.hidden));
  const fail=scenario();
  assert.equal(fail.fn({tier:'paid',source:'server_error'}),false);
  assert.equal(fail.overview.hidden,true);
  assert.ok(fail.upsells.every(node=>node.hidden));
  assert.ok(js.includes('management.hidden = !current.hasStripeBilling'));
  assert.ok(js.includes('paidThroughText(current)'));
  assert.ok(html.includes('id="member-billing-portal"'));
  assert.ok(html.includes('data-live-billing-offer="flamewalker_plus_monthly"'));
  assert.ok(html.includes('data-live-billing-offer="flamewalker_plus_annual"'));
});

test('dashboard compass unifies learning, current Path focus and next action without private reflections', () => {
  const html=read('members.html');
  const js=read('js/member-dashboard.js');
  const css=read('css/member-dashboard.css');
  const loader=read('js/member-bootstrap.js');
  for (const token of ['member-journey-compass','data-dashboard-reading-name','data-dashboard-reading-state','data-dashboard-reading-link',
    'data-dashboard-focus-name','data-dashboard-focus-state','data-dashboard-action-state','data-dashboard-continue-tool',
    'id="member-quick-action"','id="save-quick-action"']) assert.ok(html.includes(token),token);
  assert.ok(html.includes('css/member-dashboard.css?v=journey-compass-v1'));
  assert.ok(loader.includes("src === 'js/member-dashboard.js'"));
  assert.ok(loader.includes("src + '?v=dashboard-returning-v2'"));
  assert.ok(js.includes('window.NBJBLearningContinuity?.get?.()'));
  assert.ok(js.includes("entitlementState?.tier === 'paid' && entitlementState?.source === 'server'"));
  assert.ok(js.includes("link.href = 'member-lessons.html'"));
  assert.ok(js.includes("link.href = 'member-start-here.html'"));
  assert.ok(js.includes("renderReading(entitlementState);"));
  assert.ok(js.includes("renderNextAction(state);"));
  assert.ok(!js.includes('entry.data?.facts'), 'dashboard must not display private journal details');
  assert.ok(!js.includes('entry.data?.feelings'), 'dashboard must not display private journal details');
  assert.ok(css.includes('.member-journey-compass .member-today-grid'));
  assert.ok(css.includes('@media(max-width:1040px)'));
  assert.ok(js.includes('44 published guided lessons'));
});

test('dashboard reader link is paid-only and resumes the device bookmark', () => {
  const js=read('js/member-dashboard.js');
  const from=js.indexOf('  function renderReading(entitlementState) {');
  const to=js.indexOf('  function renderFocus(state)',from);
  assert.ok(from>=0&&to>from);
  const elems={};
  for(const key of ['[data-dashboard-reading-name]','[data-dashboard-reading-state]','[data-dashboard-reading-link]','[data-dashboard-action-title]','[data-dashboard-action-state]'])
    elems[key]={textContent:'',href:''};
  let getCalls=0;
  const ctxt={
    document:{querySelector:key=>elems[key]||null},
    window:{NBJBLearningContinuity:{get:()=>{getCalls++;return{slug:'father-wound',title:'The Father Wound',section:5,total:17};}}},
  };
  const functions=vm.runInNewContext(
    'function setText(selector,value){const n=document.querySelector(selector);if(n)n.textContent=value;}\n'+
    js.slice(from,to)+'\n({renderReading,renderNextAction})',ctxt);
  functions.renderReading({tier:'free',source:'server'});
  assert.equal(elems['[data-dashboard-reading-link]'].href,'member-start-here.html');
  assert.equal(getCalls,0,'free accounts must never consult paid reading metadata');
  functions.renderReading({tier:'paid',source:'server_error'});
  assert.equal(getCalls,0,'unverified paid display must not grant a protected reading link');
  functions.renderReading({tier:'paid',source:'server'});
  assert.equal(elems['[data-dashboard-reading-link]'].href,'member-premium-lesson.html?lesson=father-wound&section=5');
  assert.match(elems['[data-dashboard-reading-state]'].textContent,/Section 5 of 17/);
  functions.renderNextAction({journey:{nextAction:'Prepare the school bag tonight'}});
  assert.equal(elems['[data-dashboard-action-state]'].textContent,'Prepare the school bag tonight');
});


test('Progress Learning Trail tracks voluntary Path/practice metadata but not private writing', () => {
  const html=read('member-progress.html');
  const js=read('js/member-learning-progress.js');
  const bootstrap=read('js/member-bootstrap.js');
  const validator=read('scripts/validate_site.py');
  assert.ok(html.includes('id="learning-trail-heading"'));
  for(const token of ['data-learning-trail-focus','data-learning-trail-reading','data-learning-trail-reading-link',
    'data-learning-trail-count','data-learning-trail-stages','data-learning-trail-practiced','data-learning-trail-status'])
      assert.ok(html.includes(token),token);
  assert.ok(bootstrap.includes('progress: ["js/member-history-insights.js", "js/member-learning-progress.js"]'));
  assert.ok(bootstrap.includes("src + '?v=member-path-v1'"));
  assert.ok(validator.includes('"js/member-learning-progress.js"'));
  assert.ok(js.includes("entitlement?.tier === 'paid' && entitlement?.source === 'server'"));
  assert.ok(js.includes("item?.status === 'published'"));
  assert.ok(js.includes("nbjb.plus.lesson-progress.v1."));
  assert.ok(js.includes("body: { action: 'catalog' }"));
  assert.ok(js.includes("auth?.user?.id !== userId"));
  assert.ok(js.includes('Reading alone does not mark a lesson.'));
  assert.ok(js.includes("No automatic completion or healing score."));
  assert.doesNotMatch(js,/\.from\(['"]flamewalker_premium_lessons['"]\)/);
  assert.doesNotMatch(js,/\.insert\(|\.upsert\(|\.update\(/);
  assert.doesNotMatch(js,/data\.(facts|feelings|notes|responses|journal)/);
});

test('Learning Trail does not fetch paid lesson catalog for free members', async () => {
  const source=read('js/member-learning-progress.js');
  const selectors={};
  const element=()=>({textContent:'',href:'',dataset:{},children:[],
    replaceChildren(){this.children=[];},
    append(...items){this.children.push(...items);},setAttribute(k,v){this[k]=v;}});
  const document={querySelector:key=>selectors[key]||(selectors[key]=element()),createElement:()=>element()};
  let fetches=0;
  const window={
    NBJBMemberService:{load:()=>({journey:{focus:'Fire Reclamation',progress:{'Fire Reclamation':'practicing'}}}),
      stages:['Fire Reclamation','Voice of Fire']},
    NBJBAuth:{user:{id:'u-one'},client:{functions:{invoke:async()=>{fetches++;return{data:{lessons:[]}};}}}},
    NBJBEntitlements:{ready:Promise.resolve(),load:()=>({tier:'free',source:'server'})},
    NBJBLearningContinuity:{get:()=>{throw new Error('free membership must not read paid metadata');}}
  };
  vm.runInNewContext(source,{window,document,localStorage:{getItem:()=>null},Date,Promise});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fetches,0);
  assert.equal(selectors['[data-learning-trail-focus]'].textContent,'Fire Reclamation');
  assert.equal(selectors['[data-learning-trail-reading-link]'].href,'member-start-here.html');
  assert.equal(selectors['[data-learning-trail-count]'].textContent,'Flamewalker Free');
  const stages=selectors['[data-learning-trail-stages]'].children;
  assert.equal(stages.length,2);
  assert.equal(stages[0].dataset.currentFocus,'true');
  assert.match(stages[0].children[1].textContent,/Practicing/);
});

test('Learning Trail counts only published and deliberately marked lessons', async () => {
  const source=read('js/member-learning-progress.js');
  const selectors={};
  const element=()=>({textContent:'',href:'',dataset:{},children:[],
    replaceChildren(){this.children=[];},append(...items){this.children.push(...items);},setAttribute(k,v){this[k]=v;}});
  const document={querySelector:key=>selectors[key]||(selectors[key]=element()),createElement:()=>element()};
  const window={
    NBJBMemberService:{load:()=>({journey:{focus:'',progress:{}}}),stages:['Fire Reclamation']},
    NBJBAuth:{user:{id:'u-two'},client:{functions:{invoke:async()=>({data:{lessons:[
      {slug:'published-one',title:'Published Lesson',status:'published'},
      {slug:'private-draft',title:'Private Draft',status:'editorial_review'}
    ]}})}}},
    NBJBEntitlements:{ready:Promise.resolve(),load:()=>({tier:'paid',source:'server'})},
    NBJBLearningContinuity:{get:()=>({slug:'published-one',title:'Published Lesson',section:2,total:8})}
  };
  const data={'published-one':'2026-11-16T10:00:00Z','private-draft':'2026-11-16T12:00:00Z'};
  vm.runInNewContext(source,{window,document,localStorage:{getItem:()=>JSON.stringify(data)},Date,Promise});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(selectors['[data-learning-trail-count]'].textContent,'1 deliberately marked');
  assert.equal(selectors['[data-learning-trail-reading-link]'].href,'member-premium-lesson.html?lesson=published-one&section=2');
  const list=selectors['[data-learning-trail-practiced]'].children;
  assert.equal(list.length,1);
  assert.equal(list[0].children[0].textContent,'Published Lesson');
  assert.ok(!JSON.stringify(list).includes('Private Draft'));
});


test('responsive member navigation keeps essentials visible and all secondary pages under More', () => {
  const js=read('js/member-platform.js');
  const css=read('css/members.css');
  assert.ok(js.includes("const primaryKeys = new Set(['dashboard', 'lessons', 'path', 'tools', 'work'])"));
  assert.ok(js.includes("const compactKeys = new Set(['path', 'tools', 'work'])"));
  assert.ok(js.includes("document.createElement('details')"));
  assert.ok(js.includes("document.createElement('summary')"));
  assert.ok(js.includes("moreToggle.textContent = 'More'"));
  assert.ok(js.includes("menu.append(signOut)"));
  assert.ok(js.includes("event.key === 'Escape'"));
  assert.ok(js.includes("more.open && !more.contains(event.target)"));
  assert.ok(css.includes('.member-nav-more:not([open]) .member-nav-more-panel { display: none; }'));
  assert.ok(css.includes('.member-subnav > a.member-nav-compact-hide { display: none; }'));
  assert.ok(css.includes('.member-nav-mobile-duplicate { display: block !important; }'));
  assert.ok(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'));
  assert.doesNotMatch(css, /\.member-subnav\s*\{[^}]*overflow-x:\s*auto/s);
  assert.ok(js.includes("['watch', 'member-media.html', 'Watch · Soon']"));
  assert.ok(js.includes("['community', 'member-community.html', 'Circle · Soon']"));
});

test('member navigation renders five desktop destinations and reachable secondary actions', () => {
  const source=read('js/member-platform.js');
  const routes=source.slice(source.indexOf('  const memberRoutes ='),source.indexOf('  function status('));
  const fn=source.slice(source.indexOf('  function ensureMemberNav() {'),source.indexOf('  function progressPercent('));
  const element=tag=>({
    tag,children:[],dataset:{},handlers:{},attributes:{},
    classList:{classes:[],add(value){this.classes.push(value);}},
    append(...items){this.children.push(...items);},
    appendChild(item){this.children.push(item);},
    replaceChildren(){this.children=[];},
    setAttribute(key,value){this.attributes[key]=value;},
    addEventListener(key,value){this.handlers[key]=value;}
  });
  const nav=element('nav');
  const document={
    querySelectorAll:selector=>selector==='.member-subnav'?[nav]:[],
    createElement:element,
    addEventListener(){}
  };
  vm.runInNewContext(routes+fn+'\nensureMemberNav();',{document});
  const primary=nav.children.filter(child=>child.tag==='a');
  assert.deepEqual(primary.map(x=>x.dataset.memberNav),['dashboard','lessons','path','tools','work']);
  // Search and More now live in the same right-aligned navigation group.
  const actions=nav.children.find(child=>child.tag==='div');
  assert.ok(actions,'Search / More group must be available');
  assert.equal(actions.className,'member-nav-actions');
  const more=actions.children.find(child=>child.tag==='details');
  assert.ok(more,'More must remain available beside Search');
  const [toggle,panel]=more.children;
  assert.equal(toggle.tag,'summary');
  assert.equal(toggle.textContent,'More');
  const links=panel.children.filter(x=>x.tag==='a');
  for(const key of ['path','tools','work','progress','library','watch','store','community','profile','settings'])
    assert.ok(links.some(link=>link.dataset.memberNav===key),'More must include '+key);
  assert.ok(links.some(link=>link.href==='index.html' && link.textContent==='Exit to site'));
  const signOut=panel.children.find(x=>x.tag==='button');
  assert.equal(signOut.textContent,'Sign Out');
  assert.equal(signOut.attributes['aria-label'],'Sign out of Flamewalker');
});


test('member feedback is authenticated, voluntary, and clearly email-mediated', () => {
  const html=read('member-feedback.html');
  const js=read('js/member-feedback.js');
  const bootstrap=read('js/member-bootstrap.js');
  const nav=read('js/member-platform.js');
  const validator=read('scripts/validate_site.py');
  assert.match(html,/data-member-page="feedback"/);
  assert.match(html,/id="nbjb-member-access-gate"/);
  assert.match(html,/noindex,nofollow/);
  for(const id of ['member-feedback-form','feedback-topic','feedback-page','feedback-device',
    'feedback-message','feedback-private-check','feedback-copy','feedback-open-email',
    'feedback-prepared-wrap','feedback-outcome'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/does not submit anything to a website database/);
  assert.match(html,/press <strong>Send<\/strong> in your email app/);
  assert.match(html,/Please|passwords, account numbers/);
  assert.ok(bootstrap.includes('feedback: ["js/member-feedback.js"]'));
  assert.ok(bootstrap.includes("src === 'js/member-feedback.js'"));
  assert.ok(nav.includes("['feedback', 'member-feedback.html', 'Send Feedback']"));
  assert.ok(validator.includes('"member-feedback.html"'));
  assert.ok(validator.includes('"js/member-feedback.js"'));
  assert.ok(read('members.html').includes('href="member-feedback.html?page=dashboard"'));
  assert.ok(js.includes("window.location.href = mailto;"));
  assert.ok(js.includes("navigator.clipboard?.writeText"));
  assert.doesNotMatch(js,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|functions[.]invoke|\.insert\(|\.upsert\(/);
  assert.ok(html.includes('href="support.html"'));
});

test('feedback prepares a private-by-default email without transmitting until member sends', async () => {
  const source=read('js/member-feedback.js');
  const listeners={};
  const page={value:''};
  const prepared={value:'',focus(){},select(){}};
  const wrap={hidden:true};
  const status={textContent:''};
  let mailto='';
  let copied='';
  const form={reportValidity:()=>true,addEventListener:(key,fn)=>{listeners['form:'+key]=fn;}};
  const copy={addEventListener:(key,fn)=>{listeners['copy:'+key]=fn;}};
  const controls={
    '#member-feedback-form':form,'#feedback-topic':{value:'Broken link or button'},
    '#feedback-page':page,'#feedback-device':{value:'Phone'},
    '#feedback-message':{value:'The Lessons button was not visible on my phone.'},
    '#feedback-private-check':{checked:true},'#feedback-outcome':status,
    '#feedback-prepared-wrap':wrap,'#feedback-prepared':prepared,'#feedback-copy':copy
  };
  const document={querySelector:selector=>controls[selector]||null};
  const window={location:{set href(value){mailto=value;}}};
  const navigator={clipboard:{writeText:async text=>{copied=text;}}};
  vm.runInNewContext(source,{window,document,location:{search:'?page=lessons'},
    URLSearchParams,navigator});
  assert.equal(page.value,'Lessons Catalog');
  assert.equal(mailto,'','no network or email action on page load');
  await listeners['copy:click']();
  assert.match(copied,/Issue: Broken link or button/);
  assert.match(copied,/Page: Lessons Catalog/);
  assert.match(copied,/Device: Phone/);
  assert.equal(wrap.hidden,false);
  assert.equal(mailto,'','copy must not launch email');
  listeners['form:submit']({preventDefault(){}});
  assert.ok(mailto.startsWith('mailto:notbrokenjustburning@gmail.com?subject='));
  assert.ok(mailto.includes('body='));
  assert.match(status.textContent,/NBJB has not received it yet/);
});


test('all six Learning Trail cards open existing Path teaching without changing the selected focus', () => {
  const script=read('js/member-learning-progress.js');
  const html=read('member-progress.html');
  const paths={
    'Fire Reclamation':'member-path-stage.html?stage=fire-reclamation',
    "The Guardian's Path":'member-path-stage.html?stage=guardian',
    'Sacred Mirror Work':'member-path-stage.html?stage=sacred-mirror',
    'Masculine Restoration':'member-path-stage.html?stage=masculine-restoration',
    'Voice of Fire':'member-path-stage.html?stage=voice-of-fire',
    'Circle of the Flame':'member-path-stage.html?stage=circle-of-flame'
  };
  for (const [name,href] of Object.entries(paths)) {
    assert.ok(script.includes("'" + href + "'"), name + ' needs a direct teaching link');
    assert.ok(read(href.split('?')[0]).includes('<main'), href + ' must be a real member page');
  }
  assert.ok(script.includes("link.className = 'learning-trail-stage-link'"));
  assert.ok(script.includes("link.setAttribute('aria-label', 'Explore ' + name)"));
  assert.ok(script.includes("hint.textContent = 'Explore stage →'"));
  assert.ok(html.includes('.learning-trail-stage-link::after'));
  assert.ok(html.includes('.learning-trail-stages li:focus-within'));
  assert.ok(!script.includes('service.setFocus'), 'opening a stage must not change current focus');
  assert.ok(!script.includes('service.setProgress'), 'opening a stage must not change progress status');
});


test('My Path opens six authenticated member practices, not public marketing overviews', () => {
  const html=read('member-path.html');
  const member=read('member-path-stage.html');
  const css=read('css/member-path-stage.css');
  const js=read('js/member-path-stage.js');
  const platform=read('js/member-platform.js');
  const bootstrap=read('js/member-bootstrap.js');
  const progress=read('js/member-learning-progress.js');
  const validator=read('scripts/validate_site.py');
  const paths=['fire-reclamation','guardian','sacred-mirror','masculine-restoration','voice-of-fire','circle-of-flame'];
  for (const stage of paths) {
    assert.ok(html.includes('href="member-path-stage.html?stage='+stage+'"'),stage);
    assert.ok(progress.includes("'member-path-stage.html?stage="+stage+"'"),'learning trail: '+stage);
    assert.ok(js.includes("slug:'"+stage+"'"),'stage teaching: '+stage);
  }
  assert.equal((html.match(/Open member practice →/g)||[]).length,6);
  assert.doesNotMatch(html,/href="path-(?:fire-reclamation|guardian|sacred-mirror|masculine-restoration|voice-of-fire|circle-of-the-flame)[.]html"/);
  assert.ok(platform.includes("card.querySelector('a[href^=\"member-path-stage.html\"]')"));
  assert.ok(platform.includes("page === 'path-stage' && link.dataset.memberNav === 'path'"));
  assert.ok(member.includes('data-member-page="path-stage"'));
  assert.ok(member.includes('id="nbjb-member-access-gate"'));
  assert.ok(member.includes('href="members.html"'));
  assert.ok(member.includes('href="member-work.html"'));
  assert.ok(member.includes('href="member-path.html"'));
  assert.ok(member.includes('id="path-stage-open-work"'));
  assert.ok(css.includes('@media(max-width:720px)'));
  assert.ok(bootstrap.includes('"path-stage": ["js/member-path-foundations.js", "js/member-path-stage.js"]'));
  assert.ok(bootstrap.includes("src + '?v=member-path-v1'"));
  assert.ok(validator.includes('"member-path-stage.html"'));
  assert.ok(validator.includes('"js/member-path-stage.js"'));
  assert.ok(validator.includes('"js/member-path-foundations.js"'));
  assert.ok(member.includes('id="path-stage-foundation-blocks"'));
  assert.ok(member.includes('id="path-stage-deeper"'));
  assert.ok(member.includes('href="#path-stage-reflection"'));
  assert.ok(bootstrap.includes("src + '?v=member-depth-v2'"));
  assert.ok(member.includes('js/member-bootstrap.js?v=member-depth-v2'));
  assert.ok(css.includes('.path-stage-course-jump'));
  assert.ok(validator.includes('"css/member-path-stage.css"'));
});

test('member stages include full public foundations and substantially deeper authored teaching', () => {
  const source = read('js/member-path-foundations.js');
  const context = {window:{}};
  vm.runInNewContext(source,context);
  const foundations = context.window.NBJBPathFoundations;
  const mapping = {
    'fire-reclamation':'path-fire-reclamation.html',
    'guardian':'path-guardian.html',
    'sacred-mirror':'path-sacred-mirror.html',
    'masculine-restoration':'path-masculine-restoration.html',
    'voice-of-fire':'path-voice-of-fire.html',
    'circle-of-flame':'path-circle-of-the-flame.html'
  };
  for (const [key,publicPath] of Object.entries(mapping)) {
    const full = foundations[key];
    assert.ok(full, key + ' has no complete foundation');
    assert.equal(full.source,publicPath);
    assert.ok(full.blocks.length >= 17,key + ' is missing public teaching blocks');
    assert.ok(full.blocks.some(block=>block.kind==='heading'),key);
    assert.ok(full.blocks.some(block=>block.kind==='paragraph'),key);
    const original = read(publicPath);
    assert.ok(original.includes(full.blocks[1].text.slice(0,18)),key + ' source changed; refresh foundation mirror');
  }
  assert.ok(foundations['fire-reclamation'].blocks.some(b=>/What this stage is not/.test(b.text)));
  assert.ok(foundations['fire-reclamation'].blocks.some(b=>/Core practices/.test(b.text)));
  assert.ok(foundations['fire-reclamation'].blocks.some(b=>/Reflection questions/.test(b.text)));
  const member = read('js/member-path-stage.js');
  const depthSection = member.slice(member.indexOf("slug:'fire-reclamation'"),member.indexOf("slug:'guardian'"));
  assert.equal((depthSection.match(/"heading":/g)||[]).length,12,'Fire Reclamation should have twelve expanded member chapters');
  assert.equal((member.match(/^\s*deepDive:\[/gm)||[]).length,6,'every Path stage should have member-only depth');
  for (const term of ['timeline', 'survival', 'Case study:','Integration:']) {
    assert.ok(depthSection.includes(term), 'Fire is missing substantive '+term+' teaching');
  }
  assert.ok(member.includes('window.NBJBPathFoundations?.[slug]?.blocks'));
  assert.ok(member.includes("String(section.text||'').split("));
  assert.ok(member.includes("'path-stage-course-meta'"));
});

test('Path member practice saves only by explicit choice, with local structured My Work entry', () => {
  const source=read('js/member-path-stage.js');
  const elements={};
  const node=tag=>({
    tag,children:[],textContent:'',hidden:true,value:'',checked:false,disabled:false,
    dataset:{},attributes:{},events:{},className:'',
    append(...items){this.children.push(...items);},
    setAttribute(name,value){this.attributes[name]=value;},
    addEventListener(type,handler){this.events[type]=handler;}
  });
  const document={
    createElement:node,
    getElementById:id=>elements[id]||(elements[id]=node('div'))
  };
  const state={journey:{focus:'',progress:{'Fire Reclamation':'not-started'},nextAction:''}};
  let saved=0, focusChanged=0, progressChanged=0, actionChanged=0, last=null;
  const service={
    load:()=>state,
    listEntries:()=>[],
    setFocus:focus=>{focusChanged++;state.journey.focus=focus;return{ok:true,data:state};},
    setStageProgress:(focus,status)=>{progressChanged++;state.journey.progress[focus]=status;return{ok:true,data:state};},
    update:patch=>{actionChanged++;state.journey.nextAction=patch.journey.nextAction;return{ok:true,data:state};},
    recordToolEntry:(kind,payload)=>{saved++;last={kind,payload};return{ok:true};}
  };
  const window={NBJBMemberService:service,NBJBAuth:{user:{id:'one'}}};
  const location={search:'?stage=fire-reclamation'};
  vm.runInNewContext(read('js/member-path-foundations.js'),{window});
  vm.runInNewContext(source,{window,document,location,URLSearchParams,navigator:{clipboard:{writeText:async()=>{}}}});
  assert.equal(saved,0,'loading the page must not save anything');
  assert.equal(focusChanged,0);
  assert.equal(progressChanged,0);
  assert.equal(actionChanged,0);
  assert.equal(elements['path-stage-content'].hidden,false);
  assert.equal(elements['path-stage-heading'].textContent,'Fire Reclamation. Your work starts here.');
  assert.equal(elements['path-stage-questions'].children.length,3);
  assert.equal(elements['path-stage-foundation-blocks'].children.length,19,
    'the whole public foundation must render inside the member page');
  assert.equal(elements['path-stage-teaching-blocks'].children.length,15,
    'three member core teachings plus twelve expanded Fire chapters');
  assert.match(elements['path-stage-course-meta'].textContent,/approximately \d+ minutes to read/);
  const row=elements['path-stage-questions'].children[0];
  const answer=row.children[2];
  assert.equal(answer.tag,'textarea');
  answer.value='I want the past to stop deciding my future relationships.';
  assert.equal(saved,0,'typing must not save');
  elements['path-stage-form'].events.submit({preventDefault(){}});
  assert.equal(saved,1);
  assert.equal(last.kind,'Path Reflection');
  assert.equal(last.payload.data.stageKey,'fire-reclamation');
  assert.equal(last.payload.data.journalEntries.length,1);
  assert.match(last.payload.data.journalEntries[0].response,/past to stop deciding/);
  assert.equal(actionChanged,0,'Next Honest Action changes require an explicit opt in');
  assert.equal(elements['path-stage-open-work'].hidden,false);
  elements['path-stage-next-action'].value='I will write a one-sentence boundary.';
  elements['path-stage-update-next-action'].checked=true;
  elements['path-stage-form'].events.submit({preventDefault(){}});
  assert.equal(saved,2);
  assert.equal(actionChanged,1);
  assert.equal(state.journey.nextAction,'I will write a one-sentence boundary.');
  assert.ok(last.payload.data.journalEntries.some(x=>x.prompt==='One small action I can control next'));
  elements['path-stage-set-focus'].events.click();
  assert.equal(focusChanged,1);
  elements['path-stage-progress'].value='practicing';
  elements['path-stage-progress'].events.change();
  assert.equal(progressChanged,1);
  assert.equal(state.journey.progress['Fire Reclamation'],'practicing');
  assert.ok(read('js/member-platform.js').includes("['Lesson Journal','Path Reflection'].includes(entry.tool)"));
  assert.ok(read('member-work.html').includes('<option>Path Reflection</option>'));
  assert.ok(read('member-work.html').includes('data-work-tool="Path Reflection"'));
  assert.doesNotMatch(source,/fetch\(|functions[.]invoke|sessionStorage|\.insert\(|\.upsert\(/);
});


test('lessons catalog accurately advertises 44 published lessons without implying only seven exist', () => {
  const html=read('member-lessons.html');
  assert.match(html, /44 published premium guided lessons across six tracks/);
  assert.match(html, /Track 1 of 6 · Seven founding lessons/);
  assert.match(html, /all 44 published written lessons across six tracks/);
  assert.match(html, /Five more tracks · 37 published lessons/);
  assert.doesNotMatch(html, /Flamewalker\+ · Seven published written lessons/);
  assert.doesNotMatch(html, /One free foundation lesson and seven published premium guided lessons/);
  for (let i=1;i<=7;i++) {
    assert.ok(html.includes('Flamewalker+ · Track 1 · Lesson '+i+' of 7'), 'Track 1 badge '+i);
  }
});


test('live portal UI accepts only trusted URLs and explains sandbox denial without leaking details', async () => {
  const src=read('js/member-billing.js');
  const start=src.indexOf('  function stripeRedirectUrl(value, purpose) {');
  const end=src.indexOf('  for (const button of buttons)',start);
  assert.ok(start>=0 && end>start);
  async function scenario(response, user=true) {
    const calls=[],messages=[],redirects=[],busy=[];
    const context={URL,auth:{user:user?{id:'synthetic-member'}:null,client:{functions:{invoke:async(fn,opts)=>{calls.push({fn,body:opts.body});return response;}}}},
      message:(value,error)=>messages.push({value,error}),setBusy:value=>busy.push(value),window:{location:{assign:url=>redirects.push(url)}}};
    const invoke=vm.runInNewContext(src.slice(start,end)+'\ninvokeAndRedirect',context);
    await invoke('create-live-customer-portal-session',{},'portal');
    return {calls,messages,redirects,busy};
  }
  const success=await scenario({data:{url:'https://billing.stripe.com/p/session/synthetic'}});
  assert.equal(success.calls[0].fn,'create-live-customer-portal-session');
  assert.equal(success.redirects[0],'https://billing.stripe.com/p/session/synthetic');
  const sandbox=await scenario({error:{context:{json:async()=>({}),clone:()=>({json:async()=>({error:'sandbox_test_account_not_eligible',private:'synthetic-private-detail'})})}}});
  assert.match(sandbox.messages.at(-1).value,/reserved for billing tests/);
  assert.doesNotMatch(sandbox.messages.at(-1).value,/synthetic-private-detail|sandbox_test_account_not_eligible/);
  assert.equal(sandbox.redirects.length,0);
  assert.equal(sandbox.busy.at(-1),false);
  const generic=await scenario({data:{error:'synthetic-sensitive-error'}});
  assert.match(generic.messages.at(-1).value,/We could not open Stripe/);
  assert.doesNotMatch(generic.messages.at(-1).value,/synthetic-sensitive-error/);
  for(const url of ['http://billing.stripe.com/p/session/synthetic','https://billing.stripe.com.example.com/fake','https://checkout.stripe.com/fake']) {
    const unsafe=await scenario({data:{url}});
    assert.equal(unsafe.redirects.length,0);
    assert.match(unsafe.messages.at(-1).value,/We could not open Stripe/);
  }
  const guest=await scenario({data:{url:'https://billing.stripe.com/fake'}},false);
  assert.equal(guest.calls.length,0);
  assert.match(guest.messages.at(-1).value,/session has expired/);
});

test('Learning Trail clears premium progress when access changes and ignores late catalog reads', async () => {
  const source=read('js/member-learning-progress.js');
  const selectors={};
  const element=()=>({textContent:'',href:'',dataset:{},children:[],
    replaceChildren(){this.children=[];},append(...items){this.children.push(...items);},setAttribute(k,v){this[k]=v;}});
  const document={querySelector:key=>selectors[key]||(selectors[key]=element()),createElement:()=>element()};
  let tier='paid', release, notify;
  const window={
    NBJBMemberService:{load:()=>({journey:{focus:'',progress:{}}}),stages:['Fire Reclamation']},
    NBJBAuth:{user:{id:'u-one'},client:{functions:{invoke:()=>new Promise(resolve=>{release=resolve;})}}},
    NBJBEntitlements:{ready:Promise.resolve(),load:()=>({tier,source:'server'})},
    NBJBLearningContinuity:{get:()=>({slug:'published-one',title:'Published Lesson',section:2,total:8})},
    addEventListener(type,fn){if(type==='nbjb:entitlements')notify=fn;}
  };
  vm.runInNewContext(source,{window,document,localStorage:{getItem:()=>JSON.stringify({'published-one':'2026-11-16T10:00:00Z'})},Date,Promise});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(selectors['[data-learning-trail-reading-link]'].href,'member-premium-lesson.html?lesson=published-one&section=2');
  tier='free';
  notify();
  release({data:{lessons:[{slug:'published-one',title:'Published Lesson',status:'published'}]}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(selectors['[data-learning-trail-count]'].textContent,'Flamewalker Free');
  assert.equal(selectors['[data-learning-trail-reading-link]'].href,'member-start-here.html');
  assert.ok(!JSON.stringify(selectors['[data-learning-trail-practiced]']).includes('Published Lesson'));
});

test('all protected member entry pages request a fresh QA bootstrap and changed scripts', () => {
  for (const file of memberPages) {
    assert.match(read(file), /member-bootstrap\.js\?[^"]*member-qa-20261118/, file);
  }
  const bootstrap=read('js/member-bootstrap.js');
  assert.match(bootstrap,/\['js\/member-entitlements\.js', 'js\/member-learning-progress\.js', 'js\/tool-member-history\.js'\]\.includes\(src\)\s*\? src \+ '\?v=member-qa-20261118'/);
});

test('same-browser switch immediately hides old member page and reloads for new identity',async()=>{
  const state=simulate({userId:'member-A'});
  await settle();
  assert.equal(state.body.dataset.memberAccess,'granted');
  state.setUser('member-B');
  assert.equal(state.body.dataset.memberAccess,undefined);
  assert.equal(state.reloads(),1);
});

test('member UX P2 applies accessible focus, mobile targets, explicit data export and scoped reset',()=>{
  const css=read('css/members.css');
  const premium=read('css/member-premium-lesson.css');
  const platform=read('js/member-platform.js');
  const service=read('js/member-service.js');
  assert.match(css,/data-member-motion="reduced"/);
  assert.match(css,/focus-visible/);
  assert.match(premium,/font-size:16px;min-height:96px/);
  assert.match(platform,/Copy private local member data to the clipboard/);
  assert.match(service,/nbjb\.plus\.reading-position\.v1\./);
  assert.match(service,/nbjb\.plus\.last-learning\.v1\./);
  assert.doesNotMatch(service,/localStorage\.clear\(/);
});
test('recovery flow deduplicates requests and validates session before updating password',()=>{
  const auth=read('js/member-auth.js');
  assert.match(auth,/if \(recoveryRequestPending\) return/);
  assert.match(auth,/if \(passwordUpdatePending\) return/);
  assert.match(auth,/if \(auth\.refresh\) await auth\.refresh\(\)/);
  assert.match(auth,/if \(!auth\.user\?\.id \|\| recovery\?\.hidden\)/);
  assert.match(auth,/If that account exists/);
});

function accountExportFixture({wrongOwner=false,switchDuring=false,readError=false,signedOut=false}={}) {
 const requests=[];const id='synthetic-owner';const user={id,email:'synthetic@example.invalid'};
 const auth={user:signedOut?null:user,refresh:async()=>({user:auth.user}),client:{from(table){
   let owner='',cols='',ordering=[];return {select(value){cols=value;return this;},eq(k,v){assert.equal(k,'user_id');owner=v;return this;},order(k){ordering.push(k);return this;},async range(start,end){
     requests.push({table,owner,cols,ordering,start,end});
     if(switchDuring)auth.user={id:'synthetic-other'};
     return {data:[{user_id:wrongOwner?'synthetic-other':id,display_name:'synthetic profile',provider_customer_ref:'never_export_this',access_token:'never_export_this'}],error:readError?{message:'synthetic error'}:null};
   }};
 }}};
 const window={NBJBAuth:auth};
 const document={body:{dataset:{memberAccess:signedOut?'':'granted'}},getElementById:()=>null};
 vm.runInNewContext(read('js/member-account-export.js'),{window,document,Date,Object,Error});
 return {api:window.NBJBAccountExport,requests,auth};
}
test('account export requests nine own-account datasets with explicit columns and strips unrequested properties',async()=>{
 const {api,requests}=accountExportFixture();
 const result=await api.collectAccountExport();
 assert.equal(result.account.id,'synthetic-owner');
 assert.equal(Object.keys(result.records).length,9);
 assert.equal(requests.length,9);
 for(const request of requests){
   assert.equal(request.owner,'synthetic-owner');
   assert.ok(request.cols.startsWith('user_id,'));
   assert.ok(!request.cols.includes('*'));
 }
 assert.ok(JSON.stringify(result).includes('synthetic profile'));
 assert.ok(!JSON.stringify(result).includes('never_export_this'));
 assert.ok(!JSON.stringify(result).includes('provider_customer_ref'));
});
test('account export refuses missing authentication, wrong owner, read failures and identity changes',async()=>{
 for(const opts of [{signedOut:true},{wrongOwner:true},{readError:true},{switchDuring:true}]){
   const {api}=accountExportFixture(opts);
   await assert.rejects(api.collectAccountExport());
 }
 const html=read('member-settings.html');
 assert.match(html,/id="download-account-data"/);
 assert.match(html,/Request Account Deletion/);
 assert.match(html,/does not immediately delete data or stop renewal/);
 assert.match(read('js/member-bootstrap.js'),/settings: \["js\/member-account-export.js"\]/);
});
