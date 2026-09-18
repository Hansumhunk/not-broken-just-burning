(() => {
  const service = window.NBJBMemberService;
  const entitlements = window.NBJBEntitlements;
  if (!service) return;

  const toolRoutes = Object.freeze({
    'The Forge': 'forge.html',
    'Flame Check-In': 'check-in.html',
    'Pattern Map': 'pattern-map.html',
    'Boundary Builder': 'resources.html#boundary-builder',
    'One Stone': 'resources.html#one-stone',
    'Six Sacred Questions': 'six-sacred-questions.html?worksheet=2#six-question-tool'
  });

  const pathRoutes = Object.freeze({
    'Fire Reclamation': 'path-fire-reclamation.html',
    "The Guardian's Path": 'path-guardian.html',
    'Sacred Mirror Work': 'path-sacred-mirror.html',
    'Masculine Restoration': 'path-masculine-restoration.html',
    'Voice of Fire': 'path-voice-of-fire.html',
    'Circle of the Flame': 'path-circle-of-the-flame.html'
  });

  const outcomeLabels = Object.freeze({
    improved: 'Improved',
    mixed: 'Mixed',
    unchanged: 'Unchanged',
    harder: 'Harder',
    'still-unfolding': 'Still unfolding'
  });

  function formatDate(timestamp) {
    if (!timestamp) return 'No activity recorded yet';
    try {
      return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
      return 'Activity recorded';
    }
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function setHidden(selector, hidden) {
    const node = document.querySelector(selector);
    if (node) node.hidden = Boolean(hidden);
  }

  function isFirstRun(state, entries) {
    return !state.journey.onboardingComplete
      && !state.journey.focus
      && !state.journey.nextAction
      && !state.journey.lastTool
      && !entries.length;
  }

  function renderContinue(state) {
    const link = document.querySelector('[data-dashboard-continue-link]');
    if (!link) return;
    const tool = state.journey.lastTool || '';
    const href = toolRoutes[tool] || 'member-tools.html';
    link.href = href;
    link.textContent = tool ? `Continue ${tool}` : 'Choose a tool';
    setText('[data-dashboard-continue-tool]', tool || 'No tool started yet');
    setText('[data-dashboard-continue-time]', tool ? formatDate(state.journey.lastVisited) : 'Use the Toolbox when a specific problem needs a specific tool.');
  }

  function renderFocus(state) {
    const focus = state.journey.focus || '';
    const link = document.querySelector('[data-dashboard-focus-link]');
    setText('[data-dashboard-focus-name]', focus || 'Choose a current Path focus');
    const progress = focus ? (state.journey.progress?.[focus] || 'not-started') : '';
    const labels = {
      'not-started': 'Not started',
      'in-progress': 'In progress',
      practicing: 'Practicing'
    };
    setText('[data-dashboard-focus-state]', focus ? (labels[progress] || 'In progress') : 'No focus selected yet');
    if (link) {
      link.href = focus ? (pathRoutes[focus] || 'member-path.html') : 'member-path.html';
      link.textContent = focus ? 'Open this Path stage' : 'Choose my focus';
    }
  }

  function safeMeta(entry) {
    const themes = Array.isArray(entry.meta?.themes) && entry.meta.themes.length
      ? entry.meta.themes.slice(0, 3)
      : (Array.isArray(entry.tags) ? entry.tags.slice(0, 3) : []);
    return {
      tool: entry.tool || 'Saved work',
      createdAt: entry.createdAt || null,
      themes,
      outcome: outcomeLabels[entry.meta?.outcome] || ''
    };
  }

  function renderRecentWork(entries) {
    const list = document.querySelector('[data-dashboard-recent-list]');
    if (!list) return;
    list.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'member-dashboard-empty';
      empty.textContent = 'Nothing has been deliberately saved yet. Using a tool does not add it to My Work unless you explicitly choose Save to My Work.';
      list.appendChild(empty);
      return;
    }

    entries.slice(0, 4).forEach((entry) => {
      const meta = safeMeta(entry);
      const item = document.createElement('article');
      item.className = 'member-dashboard-recent-item';

      const top = document.createElement('div');
      const tool = document.createElement('strong');
      tool.textContent = meta.tool;
      const date = document.createElement('span');
      date.textContent = formatDate(meta.createdAt);
      top.append(tool, date);

      const detail = document.createElement('p');
      const parts = [];
      if (meta.themes.length) parts.push(meta.themes.join(' · '));
      if (meta.outcome) parts.push(meta.outcome);
      detail.textContent = parts.length ? parts.join(' · ') : 'Saved without comparison metadata.';

      item.append(top, detail);
      list.appendChild(item);
    });
  }

  function latestReview(state) {
    const records = Object.entries(state.review?.periodic || {})
      .map(([days, record]) => ({ days: Number(days), ...record }))
      .filter((record) => record.savedAt)
      .sort((a, b) => Number(b.savedAt) - Number(a.savedAt));
    return records[0] || null;
  }

  function renderPaidDepth(state, entries, isPaid) {
    setHidden('[data-dashboard-paid-depth]', !isPaid);
    setHidden('[data-dashboard-free-depth]', isPaid);

    if (!isPaid) return;

    const lens = state.review?.patternLens || {};
    setText('[data-dashboard-lens-statement]', lens.statement || 'No Pattern Lens saved yet.');
    setText('[data-dashboard-lens-date]', lens.updatedAt ? `Updated ${formatDate(lens.updatedAt)}` : 'Create a member-authored lens in Progress when a question deserves comparison.');

    const review = latestReview(state);
    if (review) {
      setText('[data-dashboard-review-window]', `${review.days}-day Flame Review`);
      setText('[data-dashboard-review-takeaway]', review.takeaway || 'A review was saved without a takeaway.');
      setText('[data-dashboard-review-date]', `Saved ${formatDate(review.savedAt)}`);
    } else {
      setText('[data-dashboard-review-window]', 'Flame Review');
      setText('[data-dashboard-review-takeaway]', 'No saved review takeaway yet.');
      setText('[data-dashboard-review-date]', 'Use Progress after you have enough deliberately saved work to review.');
    }

    const active = entries
      .filter((entry) => ['One Stone', 'Boundary Builder'].includes(entry.tool))
      .filter((entry) => entry.meta?.followUpStatus === 'active');

    setText('[data-dashboard-followup-count]', String(active.length));
    const followup = document.querySelector('[data-dashboard-followup-list]');
    if (followup) {
      followup.replaceChildren();
      if (!active.length) {
        const p = document.createElement('p');
        p.className = 'member-dashboard-empty';
        p.textContent = 'No active One Stone or Boundary follow-up is marked right now.';
        followup.appendChild(p);
      } else {
        active.slice(0, 3).forEach((entry) => {
          const meta = safeMeta(entry);
          const p = document.createElement('p');
          const themes = meta.themes.length ? ` · ${meta.themes.join(' · ')}` : '';
          p.textContent = `${meta.tool} · ${formatDate(meta.createdAt)}${themes}`;
          followup.appendChild(p);
        });
      }
    }
  }

  function renderLearning(state, isPaid) {
    const focus = state.journey.focus || '';
    const title = document.querySelector('[data-dashboard-learning-title]');
    const copy = document.querySelector('[data-dashboard-learning-copy]');
    const link = document.querySelector('[data-dashboard-learning-link]');
    if (!title || !copy || !link) return;

    if (isPaid) {
      title.textContent = focus ? `Go deeper with ${focus}` : 'Continue the deeper member library';
      copy.textContent = 'Paid Flamewalker access can surface the deeper recurring learning layer here while keeping flagship programs separate.';
      link.href = 'member-media.html';
      link.textContent = 'Open Watch & Learn';
      return;
    }

    title.textContent = focus ? `Start with ${focus}` : 'Start with the Free Library';
    copy.textContent = 'Free Flamewalker access includes the starter learning layer, foundational videos, and selected exercises without turning the public site into a crippled preview.';
    link.href = 'member-library.html';
    link.textContent = 'Open the Free Library';
  }

  function renderFirstRun(state, entries) {
    const firstRun = isFirstRun(state, entries);
    setHidden('[data-dashboard-first-run]', !firstRun);
    setHidden('[data-dashboard-returning]', firstRun);
  }

  function render() {
    const state = service.load();
    const entries = service.listEntries();
    const entitlementState = entitlements?.load?.() || { tier: 'free' };
    const isPaid = entitlements?.hasTier?.('paid', entitlementState) || false;

    renderFirstRun(state, entries);
    renderContinue(state);
    renderFocus(state);
    renderRecentWork(entries);
    renderPaidDepth(state, entries, isPaid);
    renderLearning(state, isPaid);

    setText('[data-dashboard-saved-count]', String(entries.length));
  }

  document.querySelector('#save-quick-action')?.addEventListener('click', () => {
    window.setTimeout(render, 0);
  });

  window.addEventListener('pageshow', render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();