(() => {
  const service = window.NBJBMemberService;
  if (!service) return;

  const page = document.body.dataset.memberPage || '';
  const state = service.load();

  const memberRoutes = [
    ['dashboard', 'members.html', 'Dashboard'],
    ['path', 'member-path.html', 'My Path'],
    ['tools', 'member-tools.html', 'Toolbox'],
    ['work', 'member-work.html', 'My Work'],
    ['progress', 'member-progress.html', 'Progress'],
    ['library', 'member-library.html', 'Library'],
    ['watch', 'member-media.html', 'Watch'],
    ['store', 'member-store.html', 'Store'],
    ['community', 'member-community.html', 'Circle'],
    ['profile', 'member-profile.html', 'Profile'],
    ['settings', 'member-settings.html', 'Settings']
  ];

  function status(message, target = document.querySelector('[data-member-status]')) {
    if (!target) return;
    target.textContent = message;
    window.setTimeout(() => {
      if (target.textContent === message) target.textContent = '';
    }, 3200);
  }

  function fillText(selector, value, fallback) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value || fallback || '';
    });
  }

  function ensureMemberNav() {
    document.querySelectorAll('.member-subnav').forEach((nav) => {
      nav.replaceChildren();
      memberRoutes.forEach(([key, href, label]) => {
        const link = document.createElement('a');
        link.dataset.memberNav = key;
        link.href = href;
        link.textContent = label;
        nav.appendChild(link);
      });
      const exit = document.createElement('a');
      exit.className = 'member-exit';
      exit.href = 'index.html';
      exit.textContent = 'Exit to site';
      nav.appendChild(exit);
    });
  }

  function progressPercent(data = service.load()) {
    const weights = { 'not-started': 0, 'in-progress': 0.5, practicing: 1 };
    const values = service.stages.map((stage) => weights[data.journey.progress[stage]] ?? 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round((total / service.stages.length) * 100);
  }

  function renderCommon(data = service.load()) {
    const name = data.profile.displayName;
    const values = data.journey.values || [];
    fillText('[data-member-name]', name, 'Flamewalker');
    fillText('[data-member-focus-preview]', data.journey.focus, 'Not chosen yet');
    fillText('[data-member-action-preview]', data.journey.nextAction, 'Choose one workable next step');
    fillText('[data-member-values-preview]', values.length ? values.join(' · ') : '', 'Choose the values that need attention');
    fillText('[data-member-last-tool]', data.journey.lastTool, 'No tool recorded yet');
    fillText('[data-member-progress-text]', `${progressPercent(data)}%`, '0%');

    document.querySelectorAll('[data-member-progress-bar]').forEach((bar) => {
      bar.style.width = `${progressPercent(data)}%`;
      bar.setAttribute('aria-valuenow', String(progressPercent(data)));
    });

    document.querySelectorAll('[data-member-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.memberNav === page);
      if (link.dataset.memberNav === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    return Promise.resolve(copied);
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'No activity yet';
    return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function repeatedPatternTerms(entries) {
    const stop = new Set(['this','that','with','from','have','what','when','where','which','were','been','they','them','their','then','than','into','about','because','could','would','should','there','here','just','really','very','more','some','same','also','still','only','does','did','doing','after','before','again','pattern','notice','noticed','verify','evidence','inference','summary']);
    const counts = new Map();
    entries.forEach((entry) => {
      const source = [entry.summary, entry.data?.repeat, entry.data?.event, entry.data?.changed].filter(Boolean).join(' ').toLowerCase();
      const words = new Set((source.match(/[a-z0-9']+/g) || []).filter((word) => word.length >= 4 && !stop.has(word)));
      words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    });
    return [...counts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  }

  function renderProgressHistory() {
    const entries = service.listEntries();
    const patternEntries = service.listEntries('Pattern Map');
    fillText('[data-activity-count]', String(entries.length), '0');
    fillText('[data-pattern-count]', String(patternEntries.length), '0');
    fillText('[data-last-activity]', entries[0] ? formatDate(entries[0].createdAt) : '', 'No saved activity yet');

    const history = document.querySelector('#member-history-list');
    if (history) {
      history.replaceChildren();
      if (!entries.length) {
        const empty = document.createElement('p');
        empty.className = 'member-empty-state';
        empty.textContent = 'Nothing has been saved to member history on this device yet. Tool history appears only when you explicitly choose to save it.';
        history.appendChild(empty);
      } else {
        entries.slice(0, 20).forEach((entry) => {
          const card = document.createElement('article');
          card.className = 'member-history-card';
          const top = document.createElement('div');
          top.className = 'member-history-top';
          const tool = document.createElement('strong');
          tool.textContent = entry.tool;
          const date = document.createElement('span');
          date.textContent = formatDate(entry.createdAt);
          top.append(tool, date);
          const title = document.createElement('h3');
          title.textContent = entry.title || 'Saved reflection';
          const summary = document.createElement('p');
          summary.textContent = entry.summary || 'No summary saved.';
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'member-history-remove';
          remove.dataset.deleteEntry = entry.id;
          remove.textContent = 'Remove from this device';
          card.append(top, title, summary, remove);
          history.appendChild(card);
        });
      }
    }

    const review = document.querySelector('#pattern-longitudinal-review');
    if (review) {
      review.replaceChildren();
      const heading = document.createElement('h3');
      heading.textContent = patternEntries.length >= 5 ? 'Longitudinal review is ready.' : 'Build enough history to compare over time.';
      const body = document.createElement('p');
      if (!patternEntries.length) {
        body.textContent = 'Save Pattern Maps intentionally from the Pattern Map tool. Nothing is imported automatically.';
      } else if (patternEntries.length < 5) {
        body.textContent = `You have ${patternEntries.length} saved Pattern Map${patternEntries.length === 1 ? '' : 's'}. Five or more gives the review enough material to start showing repeated language across separate entries.`;
      } else {
        const terms = repeatedPatternTerms(patternEntries);
        body.textContent = terms.length
          ? `Across ${patternEntries.length} saved Pattern Maps, recurring language includes: ${terms.map(([term, count]) => `${term} (${count})`).join(', ')}.`
          : `Across ${patternEntries.length} saved Pattern Maps, no strong repeated terms meet the current transparent rule yet.`;
      }
      const caution = document.createElement('p');
      caution.className = 'member-insight-caution';
      caution.textContent = 'This is a language-frequency aid, not proof of motive, diagnosis, causation, or objective truth. Repetition is a prompt for better questions.';
      review.append(heading, body, caution);
    }
  }

  function entryText(entry) {
    const sections = [
      `NOT BROKEN JUST BURNING — ${entry.tool || 'SAVED WORK'}`,
      formatDate(entry.createdAt),
      '',
      entry.title || 'Saved reflection',
      '',
      entry.summary || '(no summary saved)'
    ];
    if (entry.tags?.length) sections.push('', `TAGS: ${entry.tags.join(', ')}`);
    const details = Object.entries(entry.data || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
    if (details.length) {
      sections.push('', 'SAVED DETAILS');
      details.forEach(([key, value]) => sections.push(`${key.replace(/[-_]/g, ' ').toUpperCase()}: ${Array.isArray(value) ? value.join(', ') : String(value)}`));
    }
    return sections.join('\n');
  }

  function renderMyWork() {
    const allEntries = service.listEntries();
    fillText('[data-work-total]', String(allEntries.length), '0');
    document.querySelectorAll('[data-work-tool]').forEach((node) => {
      node.textContent = String(service.listEntries(node.dataset.workTool || '').length);
    });

    const search = document.querySelector('#member-work-search');
    const filter = document.querySelector('#member-work-filter');
    const needle = (search?.value || '').trim().toLowerCase();
    const tool = filter?.value || '';
    const entries = allEntries.filter((entry) => {
      if (tool && entry.tool !== tool) return false;
      if (!needle) return true;
      const haystack = [entry.tool, entry.title, entry.summary, ...(entry.tags || []), ...Object.values(entry.data || {}).map((value) => String(value))].join(' ').toLowerCase();
      return haystack.includes(needle);
    });

    const list = document.querySelector('#member-work-list');
    if (!list) return;
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'member-empty-state';
      empty.textContent = allEntries.length ? 'No saved work matches this search or filter.' : 'My Work is empty on this device. Reflections appear here only after you explicitly save them from a supported tool.';
      list.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'member-work-card';

      const top = document.createElement('div');
      top.className = 'member-history-top';
      const toolName = document.createElement('strong');
      toolName.textContent = entry.tool;
      const date = document.createElement('span');
      date.textContent = formatDate(entry.createdAt);
      top.append(toolName, date);

      const title = document.createElement('h3');
      title.textContent = entry.title || 'Saved reflection';
      const summary = document.createElement('p');
      summary.textContent = entry.summary || 'No summary saved.';
      card.append(top, title, summary);

      if (entry.tags?.length) {
        const tags = document.createElement('div');
        tags.className = 'member-work-tags';
        entry.tags.forEach((tag) => {
          const chip = document.createElement('span');
          chip.textContent = tag;
          tags.appendChild(chip);
        });
        card.appendChild(tags);
      }

      const detailEntries = Object.entries(entry.data || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
      if (detailEntries.length) {
        const details = document.createElement('details');
        details.className = 'member-work-details';
        const detailsSummary = document.createElement('summary');
        detailsSummary.textContent = 'View saved details';
        const detailList = document.createElement('dl');
        detailEntries.forEach(([key, value]) => {
          const row = document.createElement('div');
          const dt = document.createElement('dt');
          dt.textContent = key.replace(/[-_]/g, ' ');
          const dd = document.createElement('dd');
          dd.textContent = Array.isArray(value) ? value.join(', ') : String(value);
          row.append(dt, dd);
          detailList.appendChild(row);
        });
        details.append(detailsSummary, detailList);
        card.appendChild(details);
      }

      const actions = document.createElement('div');
      actions.className = 'member-actions';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'button button-ghost';
      copy.dataset.copyEntry = entry.id;
      copy.textContent = 'Copy Entry';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'member-history-remove';
      remove.dataset.deleteEntry = entry.id;
      remove.textContent = 'Remove from this device';
      actions.append(copy, remove);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  // Dashboard quick action.
  const quickAction = document.querySelector('#member-quick-action');
  if (quickAction) quickAction.value = state.journey.nextAction || '';
  document.querySelector('#save-quick-action')?.addEventListener('click', () => {
    const result = service.update({ journey: { nextAction: quickAction?.value.trim() || '' } });
    renderCommon(result.data);
    status(result.ok ? 'Next honest action saved on this device.' : 'Your browser blocked local saving.');
  });

  document.querySelectorAll('[data-set-focus]').forEach((button) => {
    button.addEventListener('click', () => {
      const focus = button.dataset.setFocus || '';
      const result = service.setFocus(focus);
      renderCommon(result.data);
      paintFocus(result.data);
      status(result.ok ? `${focus} is now your current focus.` : 'Focus changed for this visit, but local saving was blocked.');
    });
  });

  function paintFocus(data = service.load()) {
    document.querySelectorAll('[data-focus-card]').forEach((card) => {
      const current = card.dataset.focusCard === data.journey.focus;
      card.classList.toggle('is-focus', current);
      const button = card.querySelector('[data-set-focus]');
      if (button) button.textContent = current ? 'Current focus' : 'Set as my focus';
    });
  }

  document.querySelectorAll('[data-stage-progress]').forEach((select) => {
    const stage = select.dataset.stageProgress;
    if (stage) select.value = state.journey.progress[stage] || 'not-started';
    select.addEventListener('change', () => {
      const result = service.setStageProgress(stage, select.value);
      renderCommon(result.data);
      status(result.ok ? 'Path progress updated on this device.' : 'Progress changed for this visit, but local saving was blocked.');
    });
  });

  document.querySelectorAll('[data-member-tool]').forEach((link) => {
    link.addEventListener('click', () => service.noteTool(link.dataset.memberTool || ''));
  });

  const profileName = document.querySelector('#profile-name');
  const profileAbout = document.querySelector('#profile-about');
  const profileVisibility = document.querySelector('#profile-visibility');
  if (profileName) profileName.value = state.profile.displayName || '';
  if (profileAbout) profileAbout.value = state.profile.about || '';
  if (profileVisibility) profileVisibility.value = state.profile.visibility || 'private';

  document.querySelector('#save-profile')?.addEventListener('click', () => {
    const result = service.update({
      profile: {
        displayName: profileName?.value.trim() || '',
        about: profileAbout?.value.trim() || '',
        visibility: profileVisibility?.value || 'private'
      }
    });
    renderCommon(result.data);
    status(result.ok ? 'Profile saved on this device.' : 'Your browser blocked local saving.');
  });

  const onboardingName = document.querySelector('#onboarding-name');
  const onboardingFocus = document.querySelector('#onboarding-focus');
  const onboardingAction = document.querySelector('#onboarding-action');
  const onboardingValues = Array.from(document.querySelectorAll('[data-onboarding-value]'));
  if (onboardingName) onboardingName.value = state.profile.displayName || '';
  if (onboardingFocus) onboardingFocus.value = state.journey.focus || '';
  if (onboardingAction) onboardingAction.value = state.journey.nextAction || '';
  onboardingValues.forEach((box) => { box.checked = state.journey.values.includes(box.value); });

  document.querySelector('#complete-onboarding')?.addEventListener('click', () => {
    const values = onboardingValues.filter((box) => box.checked).map((box) => box.value);
    const result = service.update({
      profile: { displayName: onboardingName?.value.trim() || '' },
      journey: {
        focus: onboardingFocus?.value || '',
        nextAction: onboardingAction?.value.trim() || '',
        values,
        onboardingComplete: true
      }
    });
    if (result.data.journey.focus && result.data.journey.progress[result.data.journey.focus] === 'not-started') {
      service.setStageProgress(result.data.journey.focus, 'in-progress');
    }
    window.location.href = 'members.html';
  });

  const syncNext = document.querySelector('#setting-sync-next');
  const memberUpdates = document.querySelector('#setting-member-updates');
  const motion = document.querySelector('#setting-motion');
  if (syncNext) syncNext.checked = Boolean(state.preferences.syncNextActionLater);
  if (memberUpdates) memberUpdates.checked = Boolean(state.preferences.memberUpdatesLater);
  if (motion) motion.value = state.preferences.motion || 'system';

  document.querySelector('#save-member-settings')?.addEventListener('click', () => {
    const result = service.update({
      preferences: {
        syncNextActionLater: Boolean(syncNext?.checked),
        memberUpdatesLater: Boolean(memberUpdates?.checked),
        motion: motion?.value || 'system'
      }
    });
    status(result.ok ? 'Preferences saved on this device.' : 'Your browser blocked local saving.');
  });

  document.querySelector('#export-member-data')?.addEventListener('click', async () => {
    const copied = await copyText(service.exportJson());
    status(copied ? 'Device-local member data copied as JSON.' : 'Copy failed.');
  });

  document.querySelector('#copy-member-work')?.addEventListener('click', async () => {
    const entries = service.listEntries();
    if (!entries.length) return status('There is no saved work on this device yet.');
    const copied = await copyText(JSON.stringify(entries, null, 2));
    status(copied ? 'Saved work data copied.' : 'Copy failed.');
  });

  document.querySelector('#member-work-search')?.addEventListener('input', renderMyWork);
  document.querySelector('#member-work-filter')?.addEventListener('change', renderMyWork);

  document.querySelector('#clear-member-activity')?.addEventListener('click', () => {
    if (!window.confirm('Clear saved member tool history from this device? Your profile and Path progress will remain.')) return;
    const result = service.clearActivity();
    status(result.ok ? 'Saved tool history cleared from this device.' : 'Your browser blocked clearing local history.');
    renderProgressHistory();
    renderMyWork();
  });

  document.addEventListener('click', async (event) => {
    const copyButton = event.target.closest('[data-copy-entry]');
    if (copyButton) {
      const entry = service.listEntries().find((item) => item.id === copyButton.dataset.copyEntry);
      if (!entry) return status('That saved entry could not be found.');
      const copied = await copyText(entryText(entry));
      return status(copied ? 'Saved entry copied.' : 'Copy failed.');
    }

    const deleteButton = event.target.closest('[data-delete-entry]');
    if (!deleteButton) return;
    if (!window.confirm('Remove this saved reflection from member history on this device?')) return;
    service.removeEntry(deleteButton.dataset.deleteEntry || '');
    renderProgressHistory();
    renderMyWork();
  });

  document.querySelector('#clear-member-device')?.addEventListener('click', () => {
    if (!window.confirm('Clear the Flamewalker profile, progress, and saved member history stored on this device? This cannot be undone here.')) return;
    const cleared = service.reset();
    status(cleared ? 'Member data cleared from this device.' : 'Your browser blocked clearing local data.');
    if (cleared) window.setTimeout(() => { window.location.href = 'member-onboarding.html'; }, 500);
  });

  ensureMemberNav();
  renderCommon(state);
  paintFocus(state);
  if (page === 'progress') renderProgressHistory();
  if (page === 'work') renderMyWork();
})();
