(() => {
  const service = window.NBJBMemberService;
  const saveButton = document.querySelector('#save-pattern-member-history');
  const consent = document.querySelector('#pattern-history-consent');
  const status = document.querySelector('#pattern-history-status');
  if (!service || !saveButton) return;

  function flash(message) {
    if (!status) return;
    status.textContent = message;
    window.setTimeout(() => {
      if (status.textContent === message) status.textContent = '';
    }, 3600);
  }

  function value(selector) {
    return document.querySelector(selector)?.value.trim() || '';
  }

  saveButton.addEventListener('click', () => {
    if (!consent?.checked) return flash('Confirm that you want this Pattern Map stored in member history on this device.');

    const payload = {
      event: value('#pattern-event'),
      before: value('[data-pattern="before"]'),
      after: value('[data-pattern="after"]'),
      repeat: value('[data-pattern="repeat"]'),
      changed: value('[data-pattern="changed"]'),
      evidence: value('[data-pattern="evidence"]'),
      inference: value('[data-pattern="inference"]'),
      summary: value('#pattern-summary')
    };

    const hasContent = Object.values(payload).some(Boolean);
    if (!hasContent) return flash('Add something to the Pattern Map before saving it to history.');

    const summary = payload.summary || payload.repeat || payload.event || 'Saved Pattern Map reflection';
    const result = service.recordToolEntry('Pattern Map', {
      title: payload.event || 'Pattern Map reflection',
      summary,
      data: payload
    });

    flash(result.ok ? 'Pattern Map saved to member history on this device.' : 'Your browser blocked local member-history saving.');
  });
})();