const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../js/tool-member-history.js'), 'utf8');

class Element {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.value = '';
    this.checked = false;
    this.textContent = '';
    this.events = {};
    this.className = '';
    this.parentElement = null;
  }
  append(...nodes) {
    for (const node of nodes) {
      if (typeof node === 'string') continue;
      node.parentElement = this;
      this.children.push(node);
    }
  }
  appendChild(node) { this.append(node); return node; }
  insertBefore(node, before) {
    const index = this.children.indexOf(before);
    if (index < 0) throw new Error('insertBefore target is not a child');
    node.parentElement = this;
    this.children.splice(index, 0, node);
    return node;
  }
  setAttribute(name, value) { this[name] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]); }
  matches(selector) {
    if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
    const parts = /^\[data-([a-z-]+)="([^"]+)"\](:checked)?$/.exec(selector);
    if (!parts) return false;
    const key = parts[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return this.dataset[key] === parts[2] && (!parts[3] || this.checked);
  }
  querySelectorAll(selector) { return this.descendants().filter((el) => el.matches(selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function setup({ userId = '', dataStore = new Map(), sessionStore = new Map(), failSave = false } = {}) {
  const root = new Element('section');
  const fields = {
    '#stone-mountain': new Element('textarea'),
    '#stone-now': new Element('textarea'),
    '#stone-later': new Element('textarea')
  };
  const document = {
    createElement: (tag) => new Element(tag),
    querySelector: (selector) => selector === '#one-stone' ? root : (fields[selector] || null)
  };
  const sessionStorage = {
    getItem: (key) => sessionStore.get(key) || null,
    setItem: (key, value) => sessionStore.set(key, value),
    removeItem: (key) => sessionStore.delete(key)
  };
  const auth = {
    user: userId ? { id: userId } : null,
    onChange(callback) { callback({ user: this.user }); },
    async refresh() { return { user: this.user }; }
  };
  let redirect = '';
  const location = {
    pathname: '/resources.html',
    assign(url) { redirect = url; }
  };
  const recordsForUser = () => dataStore.get(auth.user?.id || 'anonymous') || [];
  const service = {
    listEntries(tool) { return recordsForUser().filter((entry) => entry.tool === tool); },
    recordToolEntry(tool, payload) {
      if (failSave) return { ok: false };
      const entry = { id: 'entry-' + (recordsForUser().length + 1), tool, createdAt: Date.now(), ...payload };
      dataStore.set(auth.user.id, [entry, ...recordsForUser()]);
      return { ok: true, entry };
    }
  };
  const window = { NBJBMemberService: service, NBJBAuth: auth, setTimeout() {} };
  vm.runInNewContext(script, { window, document, sessionStorage, location, console, Date });
  const button = root.descendants().find((node) => node.dataset.memberWorkButton === 'stone');
  const consent = root.descendants().find((node) => node.dataset.memberWorkConsent === 'stone');
  const status = root.descendants().find((node) => node.dataset.memberWorkStatus === 'stone');
  return { root, fields, button, consent, status, sessionStore, dataStore, redirect: () => redirect };
}

test('guest must opt in before a sign-in draft is created', async () => {
  const scenario = setup();
  scenario.fields['#stone-mountain'].value = 'Organize my desk';
  scenario.fields['#stone-now'].value = 'Put away one notebook';
  await scenario.button.events.click();
  assert.equal(scenario.sessionStore.size, 0);
  assert.equal(scenario.redirect(), '');
});

test('consented guest draft is automatically saved into the signed-in user archive on return', async () => {
  const sharedSessions = new Map();
  const sharedData = new Map();
  const guest = setup({ sessionStore: sharedSessions, dataStore: sharedData });
  guest.fields['#stone-mountain'].value = 'Organize my desk';
  guest.fields['#stone-now'].value = 'Put away one notebook';
  guest.consent.checked = true;
  await guest.button.events.click();
  assert.match(guest.redirect(), /member-auth.html\?next=resources.html%23one-stone/);
  assert.equal(sharedData.size, 0);
  assert.equal(sharedSessions.size, 1);

  const member = setup({ userId: 'flamewalker-test', sessionStore: sharedSessions, dataStore: sharedData });
  const saved = member.dataStore.get('flamewalker-test') || [];
  assert.equal(saved.length, 1);
  assert.equal(saved[0].tool, 'One Stone');
  assert.equal(saved[0].data.now, 'Put away one notebook');
  assert.equal(sharedSessions.size, 0);
  assert.match(member.status.textContent, /Saved to My Work/);
});

test('signed-in user saves directly and the record is readable under their account', async () => {
  const member = setup({ userId: 'member-2' });
  member.fields['#stone-now'].value = 'Clear one shelf';
  member.consent.checked = true;
  await member.button.events.click();
  assert.equal(member.dataStore.get('member-2').length, 1);
  assert.match(member.status.textContent, /saved to My Work/i);
  assert.equal(member.redirect(), '');
});

test('failed automatic save keeps the consented pending draft for recovery', async () => {
  const sharedSessions = new Map();
  const guest = setup({ sessionStore: sharedSessions });
  guest.fields['#stone-now'].value = 'Write the list';
  guest.consent.checked = true;
  await guest.button.events.click();
  const member = setup({ userId: 'member-3', sessionStore: sharedSessions, failSave: true });
  assert.equal(sharedSessions.size, 1);
  assert.equal(member.fields['#stone-now'].value, 'Write the list');
  assert.match(member.status.textContent, /could not finish/i);
});
