/* Optional, deliberately volatile day marks. No storage, auth, analytics or network. */
(() => {
  'use strict';
  const valid = new Set([1,2,3,4,5,6,7]);
  const marks = new Set();
  const buttons = [...document.querySelectorAll('[data-day-mark]')];
  const progress = document.querySelector('[data-progress]');
  const status = document.getElementById('fsd-status');
  const clear = document.getElementById('fsd-clear');
  const print = document.getElementById('fsd-print');
  if (!progress || !status || !clear || !print || buttons.length !== 7) return;
  const refresh = () => {
    for (const button of buttons) {
      const day = Number(button.dataset.dayMark);
      const marked = marks.has(day);
      button.setAttribute('aria-pressed', String(marked));
      // Keep the accessible toggle label stable.
      button.classList.toggle('is-marked', marked);
      const indicator = document.querySelector('[data-index-mark="' + day + '"]');
      if (indicator) indicator.hidden = !marked;
    }
    status.textContent = marks.size + ' of 7 days marked practiced.';
    clear.disabled = marks.size === 0;
  };
  for (const button of buttons) {
    const day = Number(button.dataset.dayMark);
    if (!valid.has(day)) continue;
    button.addEventListener('click', () => {
      if (marks.has(day)) marks.delete(day); else marks.add(day);
      refresh();
    });
    button.closest('[data-mark-wrap]').hidden = false;
  }
  clear.addEventListener('click', () => {
    marks.clear(); refresh();
    // Avoid losing focus when the Clear button becomes disabled.
    status.setAttribute('tabindex','-1'); status.focus();
  });
  print.addEventListener('click', () => window.print());
  // A page restored from back/forward cache after leaving is a new working session.
  window.addEventListener('pageshow', event => {
    if (event.persisted) { marks.clear(); refresh(); }
  });
  progress.hidden = false;
  refresh();
})();
