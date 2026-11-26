// NBJB Before You Hit Send — public no-account, no-message-upload tool.
// No personal text fields, storage, telemetry or backend calls in this module.
(() => {
  'use strict';

  const GUIDANCE = Object.freeze({
    pause: Object.freeze({
      title: 'Choose the pause before the reply.',
      why: 'An intense feeling deserves attention. It does not always require an immediate outgoing message.',
      template: 'I received your message. I need some time to consider the practical issue before I respond. I will follow up when I can respond clearly.',
      next: 'Next action: Put the phone down briefly, check whether an urgent responsibility needs action, then decide whether a response is actually necessary.',
      caution: 'If there is an urgent child need, a required deadline or a safety concern, handle that obligation instead of automatically delaying.'
    }),
    facts: Object.freeze({
      title: 'Answer the practical issue, not every accusation.',
      why: 'You can acknowledge a disagreement without accepting an unproven interpretation or escalating the conflict.',
      template: 'I see this differently. What I can confirm is [one specific fact]. The practical issue I need to address is [topic]. My proposed next step is [reasonable action].',
      next: 'Next action: Separate one confirmed fact from your interpretation. Remove insults, predictions about motive, and anything you cannot support.',
      caution: 'Do not use an example response as legal testimony, an admission, or a substitute for advice from your lawyer in an active legal matter.'
    }),
    boundary: Object.freeze({
      title: 'Name your own action—not someone else’s feelings.',
      why: 'A useful boundary explains what you will do in response to a behavior, rather than trying to control how another person thinks.',
      template: 'I am willing to discuss [specific practical topic]. If the conversation includes [specific behavior], I will [safe action I control]. We can return to the practical issue when that is possible.',
      next: 'Next action: Replace the brackets with one concrete behavior and one safe, realistic action within your control.',
      caution: 'Do not announce or enforce a boundary by contacting someone if doing so could increase danger or violate a legal restriction. Seek appropriate support first.'
    }),
    parenting: Object.freeze({
      title: 'Keep the child’s needs at the center.',
      why: 'When adults disagree, a short, specific logistical message can be more useful than a broad argument about the relationship.',
      template: 'Regarding [child-related practical need], I understand the current plan is [confirmed arrangement]. Please confirm [specific detail] by [appropriate time] if a reply is needed. Thank you.',
      next: 'Next action: Check existing parenting arrangements, your child’s immediate needs, and any required communication channel before writing.',
      caution: 'Follow court orders, your lawyer’s guidance, safe-contact rules and urgent child-related obligations. Never use a template to override those requirements.'
    })
  });

  function guidanceFor(purpose) {
    return Object.prototype.hasOwnProperty.call(GUIDANCE, purpose) ? GUIDANCE[purpose] : null;
  }

  if (typeof module === 'object' && module.exports) module.exports = { guidanceFor, GUIDANCE };
  if (typeof document === 'undefined') return;

  const form = document.getElementById('bys-form');
  const result = document.getElementById('bys-result');
  const heading = document.getElementById('bys-result-heading');
  const why = document.getElementById('bys-why');
  const wording = document.getElementById('bys-template');
  const step = document.getElementById('bys-step');
  const caution = document.getElementById('bys-caution');
  const status = document.getElementById('bys-status');
  const copy = document.getElementById('bys-copy');
  const again = document.getElementById('bys-again');
  const share = document.getElementById('bys-share');
  const shareStatus = document.getElementById('bys-share-status');
  const run = form?.querySelector('[data-tool-run]');
  const fallback = document.getElementById('bys-fallback');
  if (!form || !result || !heading || !wording || !why || !step || !caution || !status || !run || !fallback) return;

  run.addEventListener('click', () => {
    const selected = form.querySelector('input[name="purpose"]:checked');
    const response = guidanceFor(selected?.value);
    if (!response) {
      status.textContent = 'Choose one goal to see a suggested next step.';
      return;
    }
    // Plain text only. Never create HTML from user-selected content.
    heading.textContent = response.title;
    why.textContent = response.why;
    wording.value = response.template;
    step.textContent = response.next;
    caution.textContent = response.caution;
    result.hidden = false;
    status.textContent = '';
    heading.focus();
  });

  async function copyValue(value, fallbackField, messageElement, successLabel) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      messageElement.textContent = successLabel;
    } catch (_) {
      if (fallbackField) {
        fallbackField.focus();
        fallbackField.select();
        messageElement.textContent = 'Select and copy the highlighted wording using your device’s Copy command.';
      } else {
        messageElement.textContent = 'Clipboard unavailable. Copy this public link manually: https://notbrokenjustburning.com/before-you-send.html';
      }
    }
  }

  copy?.addEventListener('click', () => {
    if (result.hidden) return;
    copyValue(wording.value, wording, status, 'Wording copied. Review and adapt it before sending.');
  });

  again?.addEventListener('click', () => {
    form.querySelectorAll('input[type=radio]').forEach(input => { input.checked = false; });
    wording.value = '';
    heading.textContent = '';
    result.hidden = true;
    status.textContent = '';
    form.querySelector('input[name="purpose"]')?.focus();
  });

  share?.addEventListener('click', () => {
    // Never share user choice or page query parameters; only a constant canonical URL.
    copyValue('https://notbrokenjustburning.com/before-you-send.html', null, shareStatus, 'Public tool link copied. No private selections included.');
  });
  // Enable only after all handlers are registered; controls have no form owner.
  form.querySelectorAll('fieldset').forEach(group => { group.disabled = false; });
  run.disabled = false;
  fallback.hidden = true;
})();
