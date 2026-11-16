(() => {
  'use strict';
  // A private orientation surface, not a diagnosis or a healing score.
  // Only member-authored Path states and manually marked practice metadata
  // are read from per-user, per-device storage. Never upload reflection bodies.
  const service = window.NBJBMemberService;
  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const userId = auth?.user?.id || '';
  if (!service || !userId) return;

  const stageStates = Object.freeze({
    'not-started': 'Not started',
    'in-progress': 'In progress',
    practicing: 'Practicing'
  });
  // These are existing published teaching pages. Opening one does not
  // silently change the member's selected focus or progress status.
  const stageRoutes = Object.freeze({
    'Fire Reclamation': 'member-path-stage.html?stage=fire-reclamation',
    "The Guardian's Path": 'member-path-stage.html?stage=guardian',
    'Sacred Mirror Work': 'member-path-stage.html?stage=sacred-mirror',
    'Masculine Restoration': 'member-path-stage.html?stage=masculine-restoration',
    'Voice of Fire': 'member-path-stage.html?stage=voice-of-fire',
    'Circle of the Flame': 'member-path-stage.html?stage=circle-of-flame'
  });
  const practicedKey = 'nbjb.plus.lesson-progress.v1.' + userId;
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const node = selector => document.querySelector(selector);

  function setText(selector, content) {
    const target = node(selector);
    if (target) target.textContent = content;
  }
  function addEmpty(list, message) {
    if (!list) return;
    const li = document.createElement('li');
    li.textContent = message;
    list.append(li);
  }
  function formatDate(value) {
    const parsed = Date.parse(String(value || ''));
    if (!Number.isFinite(parsed)) return 'Date unavailable';
    return new Date(parsed).toLocaleDateString([], { dateStyle: 'medium' });
  }
  function renderPath() {
    const state = service.load();
    const focus = state.journey?.focus || '';
    const current = state.journey?.progress || {};
    setText('[data-learning-trail-focus]', focus || 'No focus chosen yet');
    setText('[data-learning-trail-focus-state]', focus
      ? (stageStates[current[focus]] || 'Not started') + ' · Chosen by you on this device'
      : 'Choose the life area that deserves attention right now.');
    const stages = node('[data-learning-trail-stages]');
    if (!stages) return;
    stages.replaceChildren();
    for (const name of service.stages || []) {
      const li = document.createElement('li');
      li.dataset.currentFocus = String(name === focus);
      const title = document.createElement('strong');
      const route = stageRoutes[name];
      if (route) {
        const link = document.createElement('a');
        link.className = 'learning-trail-stage-link';
        link.href = route;
        link.textContent = name;
        link.setAttribute('aria-label', 'Explore ' + name);
        title.append(link);
      } else {
        title.textContent = name;
      }
      const status = document.createElement('span');
      status.textContent = (stageStates[current[name]] || 'Not started') +
        (name === focus ? ' · Current focus' : '');
      li.append(title, status);
      if (route) {
        const hint = document.createElement('span');
        hint.className = 'learning-trail-stage-hint';
        hint.textContent = 'Explore stage →';
        hint.setAttribute('aria-hidden', 'true');
        li.append(hint);
      }
      stages.append(li);
    }
  }
  function renderReading(isPaid) {
    const readingLink = node('[data-learning-trail-reading-link]');
    const position = isPaid ? window.NBJBLearningContinuity?.get?.() : null;
    if (position && readingLink) {
      setText('[data-learning-trail-reading]', position.title);
      setText('[data-learning-trail-reading-state]', 'Section ' + position.section +
        ' of ' + position.total + ' · Saved on this device');
      readingLink.href = 'member-premium-lesson.html?lesson=' +
        encodeURIComponent(position.slug) + '&section=' + position.section;
      readingLink.textContent = 'Resume this lesson →';
    } else if (isPaid && readingLink) {
      setText('[data-learning-trail-reading]', 'Choose a published lesson');
      setText('[data-learning-trail-reading-state]', 'Your next starting point is your decision.');
      readingLink.href = 'member-lessons.html';
      readingLink.textContent = 'Browse My Lessons →';
    } else if (readingLink) {
      setText('[data-learning-trail-reading]', 'Start Here · Free foundation');
      setText('[data-learning-trail-reading-state]', 'Start Here and the five-step framework are available with Flamewalker Free.');
      readingLink.href = 'member-start-here.html';
      readingLink.textContent = 'Open Start Here →';
    }
  }
  function readManualPractice() {
    try {
      const record = JSON.parse(localStorage.getItem(practicedKey) || '{}');
      if (!record || typeof record !== 'object' || Array.isArray(record)) return {};
      return record;
    } catch (_) { return {}; }
  }
  async function renderPractice() {
    const entitlement = entitlements?.load?.();
    const paid = entitlement?.tier === 'paid' && entitlement?.source === 'server';
    const list = node('[data-learning-trail-practiced]');
    if (list) list.replaceChildren();
    renderReading(paid);
    if (!paid) {
      setText('[data-learning-trail-count]', 'Flamewalker Free');
      setText('[data-learning-trail-practice-state]', 'Guided premium practice becomes available with an active Flamewalker+ membership.');
      addEmpty(list, 'Start with the free framework, or see your available lessons.');
      setText('[data-learning-trail-status]', 'Your existing device-local practice records are not deleted when access changes.');
      return;
    }
    setText('[data-learning-trail-count]', 'Checking lesson catalog…');
    try {
      const client = auth.client;
      if (!client?.functions?.invoke) throw new Error('No trusted catalog connection');
      const response = await client.functions.invoke('read-flamewalker-lesson', { body: { action: 'catalog' } });
      if (response.error || !Array.isArray(response.data?.lessons)) throw new Error('Catalog unavailable');
      if (auth?.user?.id !== userId) return;
      const published = response.data.lessons.filter(item =>
        item?.status === 'published' && slugPattern.test(item.slug || '') && typeof item.title === 'string');
      const titles = new Map(published.map(item => [item.slug, item.title]));
      const manual = readManualPractice();
      const practiced = Object.entries(manual)
        .filter(([slug, markedAt]) => titles.has(slug) && typeof markedAt === 'string' && Number.isFinite(Date.parse(markedAt)))
        .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]));
      setText('[data-learning-trail-count]', practiced.length + ' deliberately marked');
      setText('[data-learning-trail-practice-state]',
        published.length + ' published lessons available · No automatic completion or healing score.');
      setText('[data-learning-trail-status]',
        'Lesson practice marks and Path choices live only in this browser profile, scoped to your signed-in account.');
      if (!list) return;
      if (!practiced.length) {
        addEmpty(list, 'No published lesson has been marked practiced on this device yet. Reading alone does not mark a lesson.');
        return;
      }
      for (const [slug, date] of practiced.slice(0, 5)) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = 'member-premium-lesson.html?lesson=' + encodeURIComponent(slug);
        a.textContent = titles.get(slug);
        const when = document.createElement('span');
        when.textContent = ' · Marked practiced ' + formatDate(date);
        li.append(a, when);
        list.append(li);
      }
    } catch (_) {
      setText('[data-learning-trail-count]', 'Temporarily unavailable');
      setText('[data-learning-trail-practice-state]', 'Could not verify the current published curriculum. Your local practice marks remain unchanged.');
      setText('[data-learning-trail-status]', 'Try reloading this page later. We did not change your saved work.');
      addEmpty(list, 'The lesson list could not be verified.');
    }
  }
  renderPath();
  Promise.resolve(entitlements?.ready).then(renderPractice).catch(() => {
    setText('[data-learning-trail-status]', 'Could not verify membership access. No practice records were changed.');
  });
})();