(() => {
  'use strict';
  const form = document.querySelector('#member-feedback-form');
  if (!form) return;
  const topic = document.querySelector('#feedback-topic');
  const page = document.querySelector('#feedback-page');
  const device = document.querySelector('#feedback-device');
  const message = document.querySelector('#feedback-message');
  const privateCheck = document.querySelector('#feedback-private-check');
  const status = document.querySelector('#feedback-outcome');
  const preparedWrap = document.querySelector('#feedback-prepared-wrap');
  const prepared = document.querySelector('#feedback-prepared');
  const copyButton = document.querySelector('#feedback-copy');

  const pageLabels = Object.freeze({
    dashboard: 'Dashboard',
    'start-here': 'Start Here',
    framework: 'Five-Step Framework',
    lessons: 'Lessons Catalog',
    'premium-lesson': 'Guided Lesson Reader',
    path: 'My Path',
    tools: 'Toolbox',
    workshop: 'Toolbox',
    work: 'My Work',
    progress: 'Progress',
    library: 'Library',
    store: 'Membership',
    feedback: 'Feedback'
  });
  const sourcePage = new URLSearchParams(location.search).get('page') || '';
  if (Object.prototype.hasOwnProperty.call(pageLabels, sourcePage)) page.value = pageLabels[sourcePage];

  function prepare() {
    // The HTML form and privacy checkbox are validated for both actions.
    if (!form.reportValidity() || !privateCheck.checked) {
      status.textContent = 'Choose a topic and page, describe the issue, and confirm that private details are removed.';
      return null;
    }
    const details = String(message.value || '').trim();
    if (details.length < 10) {
      status.textContent = 'Describe the website issue in at least ten characters.';
      message.focus();
      return null;
    }
    const category = topic.value;
    const report = [
      'NBJB / Flamewalker website feedback',
      'Issue: ' + category,
      'Page: ' + page.value,
      'Device: ' + (device.value || 'Not specified'),
      '',
      'What happened and what should have happened:',
      details,
      '',
      'This is website feedback, not a request for emergency support.'
    ].join('\n');
    preparedWrap.hidden = false;
    prepared.value = report;
    return { subject: 'NBJB member feedback — ' + category, report };
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = prepare();
    if (!result) return;
    // Opens the member's own email composer. This page does not transmit a
    // message, read their account, upload notes, or claim delivery.
    const address = 'support@notbrokenjustburning.com';
    const mailto = 'mailto:' + address + '?subject=' +
      encodeURIComponent(result.subject) + '&body=' + encodeURIComponent(result.report);
    status.textContent = 'Your email app should open. Review the message and press Send there. NBJB has not received it yet.';
    window.location.href = mailto;
  });

  copyButton?.addEventListener('click', async () => {
    const result = prepare();
    if (!result) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(result.report);
      status.textContent = 'Copied. Paste into an email to support@notbrokenjustburning.com and press Send yourself.';
    } catch (_) {
      prepared.focus();
      prepared.select();
      status.textContent = 'Clipboard access is unavailable. Select and copy the prepared text below, then send it from your own email app.';
    }
  });
})();