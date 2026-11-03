const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (pathName) => fs.readFileSync(path.join(root, pathName), 'utf8');
const markup = read('member-workshop.html');
const toolJS = read('js/member-workshop.js');
const toolIDs = ['checkin-tool','forge-tool','pattern-tool','boundary-builder','one-stone','six-question-tool'];

test('member workshop has all six real forms and no direct guest archive', () => {
  assert.match(markup, /data-member-page="workshop"/);
  assert.match(markup, /<main id="main-content" hidden>/);
  for (const id of toolIDs) {
    assert.equal(markup.split('id="' + id + '"').length - 1, 1, id);
    assert.equal(markup.split('data-open-workshop="' + id + '"').length - 1, 1, id);
  }
  for (const marker of ['id="stone-now"','id="forge-thought"','id="sacred-who"','data-checkin="emotion"','id="boundary-line"','id="pattern-event"']) {
    assert.ok(markup.includes(marker), marker);
  }
  const bootstrap = read('js/member-bootstrap.js');
  assert.match(bootstrap, /if \(!user\)/);
  assert.ok(bootstrap.includes('workshop: ["js/tool-member-history.js", "js/member-workshop.js"]'));
  assert.ok(bootstrap.indexOf('await loadScript("js/member-service.js")') < bootstrap.indexOf('const page = document.body.dataset.memberPage'));
});

test('public pages contain no working inputs or member archive bootstrap', () => {
  const routes = ['forge.html','check-in.html','pattern-map.html','resources.html','six-sacred-questions.html'];
  for (const name of routes) {
    const html = read(name);
    assert.ok(html.includes('member-workshop.html#'), name + ' CTA');
    assert.doesNotMatch(html, /<textarea\b/i, name + ' does not host private writing');
    assert.doesNotMatch(html, /js\/tool-member-bootstrap\.js/);
  }
});

test('member Dashboard and Toolbox continue into the signed-in workshop', () => {
  const toolbox = read('member-tools.html');
  const dashboard = read('js/member-dashboard.js');
  assert.equal(toolbox.split('href="member-workshop.html#').length - 1, 6);
  assert.equal(dashboard.split("'member-workshop.html#").length - 1, 6);
});

function mount({ userId, hash = '#one-stone' }) {
  const main = { hidden: true };
  const status = { textContent: '' };
  const loading = { removed: false, remove() { this.removed = true; } };
  const panels = toolIDs.map((id) => ({ dataset: { workshopPanel: id }, hidden: true }));
  const buttons = toolIDs.map((id) => {
    const listeners = {};
    return {
      dataset: { openWorkshop: id },
      attrs: {},
      listeners,
      classList: { toggle() {} },
      setAttribute(key, value) { this.attrs[key] = value; },
      addEventListener(event, fn) { listeners[event] = fn; }
    };
  });
  const heading = { setAttribute() {}, focus() {}, scrollIntoView() {} };
  const seen = [];
  const window = {
    NBJBMemberService: { noteTool(name) { seen.push(name); } },
    NBJBAuth: { user: userId ? { id: userId } : null },
    location: { hash },
    history: { replaceState(_a, _b, target) { window.location.hash = target; } },
    addEventListener() {}
  };
  const document = {
    querySelector(sel) {
      if (sel === '#main-content') return main;
      if (sel === '#workshop-context') return status;
      if (sel === '#workshop-loading') return loading;
      if (sel.includes(' h2')) return heading;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[data-open-workshop]') return buttons;
      if (sel === '[data-workshop-panel]') return panels;
      return [];
    }
  };
  vm.runInNewContext(toolJS, { window, document, history: window.history, console });
  return { main, loading, panels, buttons, seen, status };
}

test('workshop stays hidden without an authenticated member', () => {
  const guest = mount({ userId: '' });
  assert.equal(guest.main.hidden, true);
  assert.equal(guest.seen.length, 0);
});

test('signed-in member opens selected tool and switches without re-login', () => {
  const member = mount({ userId: 'member123' });
  assert.equal(member.main.hidden, false);
  assert.equal(member.loading.removed, true);
  assert.equal(member.panels.filter(p => !p.hidden).length, 1);
  assert.equal(member.panels.find(p => !p.hidden).dataset.workshopPanel, 'one-stone');
  assert.equal(member.seen[0], 'One Stone');
  const forge = member.buttons.find(b => b.dataset.openWorkshop === 'forge-tool');
  forge.listeners.click();
  assert.equal(member.panels.find(p => !p.hidden).dataset.workshopPanel, 'forge-tool');
  assert.equal(forge.attrs['aria-pressed'], 'true');
  assert.equal(member.seen.at(-1), 'The Forge');
});
