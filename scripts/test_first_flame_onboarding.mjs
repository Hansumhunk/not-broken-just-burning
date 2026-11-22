#!/usr/bin/env node
// Isolated MA11/MA12/MA29 regression for the existing onboarding handler.
// No network, browser account, customer data, Supabase writes, or analytics.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../js/member-platform.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../member-onboarding.html', import.meta.url), 'utf8');
const start = script.indexOf('  const onboardingSaveStatus = ');
const end = script.indexOf('  const syncNext =', start);
assert.ok(start >= 0 && end > start, 'existing onboarding handler present');
assert.match(html, /id="onboarding-save-status"[^>]*role="alert"/, 'accessible save failure status');
const source = script.slice(start, end);

function scenario({ ok, inputFocus = 'Fire Reclamation', initialState = 'not-started' }) {
  let submit;
  let updates = 0;
  let separateWrites = 0;
  let patch;
  const notice = { hidden: true, textContent: '' };
  const button = { addEventListener(type, fn) { if (type === 'click') submit = fn; } };
  const document = {
    querySelector(selector) {
      if (selector === '#complete-onboarding') return button;
      if (selector === '#onboarding-save-status') return notice;
      return null;
    }
  };
  const window = { location: { href: 'member-onboarding.html' } };
  const service = {
    stages: ['Fire Reclamation'],
    load: () => ({ journey: { progress: { 'Fire Reclamation': initialState } } }),
    update(value) {
      updates += 1;
      patch = value;
      return { ok, data: { journey: value.journey } };
    },
    setStageProgress() { separateWrites += 1; }
  };
  new Function('document', 'window', 'service', 'onboardingName',
    'onboardingFocus', 'onboardingAction', 'onboardingValues', source)(
      document, window, service, { value: 'Test member' },
      { value: inputFocus }, { value: '' }, []
    );
  assert.equal(typeof submit, 'function');
  submit();
  return { notice, path: window.location.href, updates, separateWrites, patch };
}

const success = scenario({ ok: true });
assert.equal(success.path, 'member-start-here.html');
assert.equal(success.patch.journey.focus, 'Fire Reclamation');
assert.equal(success.patch.journey.progress['Fire Reclamation'], 'in-progress');
assert.equal(success.patch.journey.onboardingComplete, true);
assert.equal(success.updates, 1);
assert.equal(success.separateWrites, 0);

const failed = scenario({ ok: false });
assert.equal(failed.path, 'member-onboarding.html', 'failed save must not redirect');
assert.equal(failed.notice.hidden, false, 'failed save must announce an error');
assert.match(failed.notice.textContent, /could not save/i);
assert.equal(failed.updates, 1);
assert.equal(failed.separateWrites, 0);

const invalid = scenario({ ok: true, inputFocus: 'unapproved-focus' });
assert.equal(invalid.patch.journey.focus, '', 'invalid stage is not saved');

const existing = scenario({ ok: true, initialState: 'practicing' });
assert.equal(existing.patch.journey.progress['Fire Reclamation'], 'practicing',
  'existing progress must not be downgraded');

console.log('PASS: The First Flame onboarding save gate — 4 isolated regression cases');
