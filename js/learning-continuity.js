(() => {
  'use strict';

  // Metadata-only, per-device continuity. Never save a lesson body, private
  // reflection answers, billing details or JWTs here.
  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const userId = auth?.user?.id;
  if (!userId) return;
  const KEY = 'nbjb.plus.last-learning.v1.' + userId;
  const CANONICAL = 'member-premium-lesson.html';
  const allowedSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function paidAccess() {
    return entitlements?.load?.()?.tier === 'paid';
  }
  function valid(v) {
    return v && typeof v === 'object' &&
      typeof v.slug === 'string' && allowedSlug.test(v.slug) && v.slug.length <= 100 &&
      typeof v.title === 'string' && v.title.length > 0 && v.title.length <= 140 &&
      typeof v.sectionTitle === 'string' && v.sectionTitle.length <= 160 &&
      Number.isInteger(v.section) && Number.isInteger(v.total) &&
      v.section >= 1 && v.total >= 1 && v.total <= 500 && v.section <= v.total;
  }
  function get() {
    if (!paidAccess()) return null;
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return valid(parsed) ? parsed : null;
    } catch (_) { return null; }
  }
  function linkFor(v) {
    return CANONICAL + '?lesson=' + encodeURIComponent(v.slug) + '&section=' + v.section;
  }
  function render() {
    const v = get();
    const shell = document.querySelector('.member-shell');
    if (!shell) return;
    let band = shell.querySelector('[data-learning-return]');
    if (!v) { if (band) band.remove(); return; }
    if (!band) {
      band = document.createElement('div');
      band.className = 'learning-return-band';
      band.dataset.learningReturn = '';
      const prefix = document.createElement('span');
      prefix.className = 'learning-return-eyebrow';
      prefix.textContent = 'Continue learning';
      const link = document.createElement('a');
      link.className = 'learning-return-link';
      link.dataset.learningReturnLink = '';
      const name = document.createElement('strong');
      name.dataset.learningReturnName = '';
      const section = document.createElement('span');
      section.dataset.learningReturnPart = '';
      const arrow = document.createElement('span');
      arrow.className = 'learning-return-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(name, section, arrow);
      band.append(prefix, link);
      shell.append(band);
    }
    const a = band.querySelector('[data-learning-return-link]');
    const title = band.querySelector('[data-learning-return-name]');
    const section = band.querySelector('[data-learning-return-part]');
    a.href = linkFor(v);
    a.setAttribute('aria-label', 'Resume ' + v.title + ', section ' + v.section + ' of ' + v.total);
    title.textContent = v.title;
    section.textContent = 'Section ' + v.section + ' of ' + v.total +
      (v.sectionTitle ? ' · ' + v.sectionTitle : '') + ' · Saved on this device';
  }
  function record({ slug, title, section, total, sectionTitle }) {
    if (!paidAccess()) return false;
    const next = { slug, title, section, total, sectionTitle, updatedAt: Date.now() };
    if (!valid(next)) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_) {
      // The lesson's older per-lesson key can still work if localStorage is blocked.
      return false;
    }
    render();
    return true;
  }

  if (!document.querySelector('link[data-learning-continuity-style]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'css/learning-continuity.css?v=1';
    css.dataset.learningContinuityStyle = '';
    document.head.append(css);
  }
  window.NBJBLearningContinuity = Object.freeze({ get, record, render });
  render();
})();
