const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const memberPages = [
  'member-community.html','member-library.html','member-media.html','member-onboarding.html',
  'member-path.html','member-premium-lesson.html','member-profile.html','member-progress.html',
  'member-settings.html','member-start-here.html','member-store.html','member-tools.html',
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
  assert.match(dashboard, /Flamewalker%20Free%20Early%20Access%20Feedback/);
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
