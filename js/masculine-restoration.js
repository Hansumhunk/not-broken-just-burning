(() => {
  const form = document.querySelector('[data-steadiness-audit]');
  if (!form) return;

  const output = form.querySelector('[data-steadiness-output]');
  const summary = form.querySelector('[data-steadiness-summary]');
  const nextAction = form.querySelector('[data-steadiness-next-action]');
  const copyButton = form.querySelector('[data-copy-steadiness]');
  const clearButton = form.querySelector('[data-clear-steadiness]');

  const labels = {
    pause: 'Pause before acting',
    body: 'Notice activation in the body',
    threat: 'Separate current threat from old threat',
    conflict: 'Stay present during hard moments',
    reset: 'Use a reliable reset routine',
    support: 'Reach for support before overload becomes damage'
  };

  const stateText = {
    working: 'working reliably',
    inconsistent: 'inconsistent right now',
    rebuilding: 'needs rebuilding'
  };

  function buildNotes() {
    const data = new FormData(form);
    const lines = [];
    const rebuild = [];

    Object.entries(labels).forEach(([key, label]) => {
      const value = data.get(key);
      if (!value) return;
      lines.push(`${label}: ${stateText[value]}.`);
      if (value === 'rebuilding') rebuild.push(label);
    });

    const action = String(data.get('next-action') || '').trim();
    const control = String(data.get('control-focus') || '').trim();

    if (!lines.length) {
      summary.textContent = 'Choose at least one audit response before building your notes.';
      nextAction.textContent = '';
      output.hidden = false;
      return;
    }

    summary.textContent = lines.join(' ');

    const suggested = rebuild.length
      ? `Start with: ${rebuild[0]}.`
      : 'No area was marked “needs rebuilding.” Pick the area that feels least reliable and practice it deliberately.';

    const actionLine = action
      ? `Your 24-hour action: ${action}`
      : 'Your 24-hour action is still yours to choose. Keep it small enough to actually do.';

    const controlLine = control
      ? `Control focus: ${control}`
      : 'Control focus: name one thing you can influence today and one thing you cannot control.';

    nextAction.textContent = `${suggested} ${controlLine} ${actionLine}`;
    output.hidden = false;
    output.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }

  async function copyNotes() {
    if (output.hidden) buildNotes();
    const text = `Masculine Restoration — Steadiness Audit\n\n${summary.textContent}\n\n${nextAction.textContent}`;
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = 'Copied';
      window.setTimeout(() => { copyButton.textContent = 'Copy My Notes'; }, 1600);
    } catch {
      copyButton.textContent = 'Copy unavailable';
    }
  }

  function clearAudit() {
    form.reset();
    summary.textContent = '';
    nextAction.textContent = '';
    output.hidden = true;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    buildNotes();
  });

  copyButton?.addEventListener('click', copyNotes);
  clearButton?.addEventListener('click', clearAudit);
})();
