(() => {
  const service = window.NBJBMemberService;
  if (!service) return;

  const page = document.body.dataset.memberPage || '';
  const themeOptions = [
    'Work', 'Relationships', 'Family', 'Parenting', 'Money', 'Identity',
    'Boundaries', 'Conflict', 'Grief', 'Wellbeing', 'Purpose', 'Trust'
  ];
  const outcomeLabels = {
    improved: 'Improved',
    mixed: 'Mixed',
    unchanged: 'Unchanged',
    harder: 'Harder',
    'still-unfolding': 'Still unfolding'
  };
  const followUpLabels = {
    active: 'Still active',
    completed: 'Completed',
    changed: 'Changed',
    abandoned: 'Abandoned',
    'no-longer-relevant': 'No longer relevant'
  };
  const lensRelationLabels = {
    supports: 'Supports this idea',
    challenges: 'Challenges this idea',
    exception: 'Exception',
    unclear: 'Still unclear'
  };
  let activeReviewDays = 30;

  function status(message) {
    const target = document.querySelector('[data-member-status]');
    if (!target) return;
    target.textContent = message;
    window.setTimeout(() => {
      if (target.textContent === message) target.textContent = '';
    }, 3600);
  }

  function formatDate(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No activity yet';
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

  function metaFor(entry) {
    const themes = Array.isArray(entry.meta?.themes) && entry.meta.themes.length ? entry.meta.themes : (entry.tags || []);
    return {
      themes,
      context: entry.meta?.context || '',
      outcome: entry.meta?.outcome || '',
      helped: entry.meta?.helped || '',
      changed: entry.meta?.changed || '',
      followUpStatus: entry.meta?.followUpStatus || '',
      followUpNote: entry.meta?.followUpNote || ''
    };
  }

  function entryText(entry) {
    const meta = metaFor(entry);
    const sections = [
      `NOT BROKEN JUST BURNING — ${entry.tool || 'SAVED WORK'}`,
      formatDate(entry.createdAt),
      '',
      entry.title || 'Saved reflection',
      '',
      entry.summary || '(no summary saved)'
    ];
    if (meta.themes.length) sections.push('', `THEMES: ${meta.themes.join(', ')}`);
    if (meta.context) sections.push('', `CONTEXT: ${meta.context}`);
    if (meta.outcome) sections.push('', `OUTCOME I MARKED: ${outcomeLabels[meta.outcome] || meta.outcome}`);
    if (meta.helped) sections.push('', `WHAT HELPED: ${meta.helped}`);
    if (meta.changed) sections.push('', `WHAT CHANGED: ${meta.changed}`);
    if (meta.followUpStatus) sections.push('', `FOLLOW-UP STATUS: ${followUpLabels[meta.followUpStatus] || meta.followUpStatus}`);
    if (meta.followUpNote) sections.push('', `FOLLOW-UP NOTE: ${meta.followUpNote}`);
    const details = Object.entries(entry.data || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
    if (details.length) {
      sections.push('', 'TOOL DETAILS');
      details.forEach(([key, value]) => sections.push(`${key.replace(/[-_]/g, ' ').toUpperCase()}: ${Array.isArray(value) ? value.join(', ') : String(value)}`));
    }
    return sections.join('\n');
  }

  function allThemes(entries) {
    return [...new Set(entries.flatMap((entry) => metaFor(entry).themes))].sort((a, b) => a.localeCompare(b));
  }

  function refreshThemeFilter(entries) {
    const filter = document.querySelector('#member-work-theme');
    if (!filter) return;
    const selected = filter.value;
    filter.replaceChildren();
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'All themes';
    filter.appendChild(all);
    const themes = allThemes(entries);
    themes.forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme;
      option.textContent = theme;
      filter.appendChild(option);
    });
    filter.value = themes.includes(selected) ? selected : '';
  }

  function makeField(labelText, control) {
    const label = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = labelText;
    label.append(text, control);
    return label;
  }

  function buildMetaEditor(entry) {
    const meta = metaFor(entry);
    const details = document.createElement('details');
    details.className = 'member-work-editor';
    details.dataset.entryEditor = entry.id;

    const summary = document.createElement('summary');
    summary.textContent = 'Edit comparison context';
    details.appendChild(summary);

    const intro = document.createElement('p');
    intro.textContent = 'Correct what you recorded later without rewriting the original tool reflection.';
    details.appendChild(intro);

    const themes = document.createElement('fieldset');
    themes.className = 'member-history-themes';
    const legend = document.createElement('legend');
    legend.textContent = 'Themes · choose up to 6';
    themes.appendChild(legend);
    const themeGrid = document.createElement('div');
    themeGrid.className = 'member-history-theme-grid';
    themeOptions.forEach((theme) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = theme;
      input.dataset.editTheme = entry.id;
      input.checked = meta.themes.includes(theme);
      const text = document.createElement('span');
      text.textContent = theme;
      label.append(input, text);
      themeGrid.appendChild(label);
    });
    themes.appendChild(themeGrid);
    details.appendChild(themes);

    const grid = document.createElement('div');
    grid.className = 'member-history-meta-grid';

    const context = document.createElement('textarea');
    context.rows = 3;
    context.dataset.editContext = entry.id;
    context.value = meta.context;

    const outcome = document.createElement('select');
    outcome.dataset.editOutcome = entry.id;
    [['', 'Not recorded'], ['improved', 'Improved'], ['mixed', 'Mixed'], ['unchanged', 'Unchanged'], ['harder', 'Harder'], ['still-unfolding', 'Still unfolding']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      outcome.appendChild(option);
    });
    outcome.value = meta.outcome;

    const helped = document.createElement('textarea');
    helped.rows = 3;
    helped.dataset.editHelped = entry.id;
    helped.value = meta.helped;

    const changed = document.createElement('textarea');
    changed.rows = 3;
    changed.dataset.editChanged = entry.id;
    changed.value = meta.changed;

    grid.append(
      makeField('Context', context),
      makeField('Outcome I would mark now', outcome),
      makeField('What helped?', helped),
      makeField('What changed?', changed)
    );

    if (entry.tool === 'One Stone' || entry.tool === 'Boundary Builder') {
      const followUp = document.createElement('select');
      followUp.dataset.editFollowUp = entry.id;
      [['', 'Not recorded'], ['active', 'Still active'], ['completed', 'Completed'], ['changed', 'Changed'], ['abandoned', 'Abandoned'], ['no-longer-relevant', 'No longer relevant']].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        followUp.appendChild(option);
      });
      followUp.value = meta.followUpStatus;

      const followUpNote = document.createElement('textarea');
      followUpNote.rows = 3;
      followUpNote.dataset.editFollowUpNote = entry.id;
      followUpNote.value = meta.followUpNote;

      grid.append(
        makeField('Follow-up status', followUp),
        makeField('Follow-up note', followUpNote)
      );
    }

    details.appendChild(grid);

    const actions = document.createElement('div');
    actions.className = 'member-actions';
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'button button-primary';
    save.dataset.saveEntryMeta = entry.id;
    save.textContent = 'Save Context Changes';
    actions.appendChild(save);
    details.appendChild(actions);
    return details;
  }

  function renderWork() {
    if (page !== 'work') return;
    const allEntries = service.listEntries();
    refreshThemeFilter(allEntries);

    const search = (document.querySelector('#member-work-search')?.value || '').trim().toLowerCase();
    const tool = document.querySelector('#member-work-filter')?.value || '';
    const theme = document.querySelector('#member-work-theme')?.value || '';
    const outcome = document.querySelector('#member-work-outcome')?.value || '';

    const entries = allEntries.filter((entry) => {
      const meta = metaFor(entry);
      if (tool && entry.tool !== tool) return false;
      if (theme && !meta.themes.includes(theme)) return false;
      if (outcome && meta.outcome !== outcome) return false;
      if (!search) return true;
      const haystack = [
        entry.tool, entry.title, entry.summary, ...meta.themes,
        meta.context, meta.outcome, meta.helped, meta.changed,
        meta.followUpStatus, meta.followUpNote,
        ...Object.values(entry.data || {}).map((value) => String(value))
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });

    const list = document.querySelector('#member-work-list');
    if (!list) return;
    list.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'member-empty-state';
      empty.textContent = allEntries.length
        ? 'No saved work matches these filters.'
        : 'My Work is empty on this device. Reflections appear here only after you explicitly save them from a supported tool.';
      list.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const meta = metaFor(entry);
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

      if (meta.themes.length) {
        const tags = document.createElement('div');
        tags.className = 'member-work-tags';
        meta.themes.forEach((theme) => {
          const chip = document.createElement('span');
          chip.textContent = theme;
          tags.appendChild(chip);
        });
        card.appendChild(tags);
      }

      if (meta.context || meta.outcome || meta.helped || meta.changed || meta.followUpStatus || meta.followUpNote) {
        const context = document.createElement('div');
        context.className = 'member-work-context';
        const rows = [
          ['Context', meta.context],
          ['Outcome I marked', meta.outcome ? (outcomeLabels[meta.outcome] || meta.outcome) : ''],
          ['What helped', meta.helped],
          ['What changed', meta.changed],
          ['Follow-up', meta.followUpStatus ? (followUpLabels[meta.followUpStatus] || meta.followUpStatus) : ''],
          ['Follow-up note', meta.followUpNote]
        ].filter(([, value]) => value);
        rows.forEach(([label, value]) => {
          const row = document.createElement('div');
          const strong = document.createElement('strong');
          strong.textContent = label;
          const text = document.createElement('span');
          text.textContent = value;
          row.append(strong, text);
          context.appendChild(row);
        });
        card.appendChild(context);
      }

      card.appendChild(buildMetaEditor(entry));

      const detailEntries = Object.entries(entry.data || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
      if (detailEntries.length) {
        const details = document.createElement('details');
        details.className = 'member-work-details';
        const detailsSummary = document.createElement('summary');
        detailsSummary.textContent = 'View original tool details';
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

  function countBy(values) {
    const counts = new Map();
    values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  }

  function listText(items, emptyText) {
    return items.length ? items.map(([label, count]) => `${label} (${count})`).join(' · ') : emptyText;
  }

  function renderReview(days = 30) {
    if (page !== 'progress') return;
    activeReviewDays = days;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const entries = service.listEntries().filter((entry) => Number(entry.createdAt || 0) >= cutoff);
    const themes = countBy(entries.flatMap((entry) => metaFor(entry).themes));
    const outcomes = countBy(entries.map((entry) => metaFor(entry).outcome).filter(Boolean)).map(([key, count]) => [outcomeLabels[key] || key, count]);
    const tools = countBy(entries.map((entry) => entry.tool));
    const followUps = countBy(entries.map((entry) => metaFor(entry).followUpStatus).filter(Boolean)).map(([key, count]) => [followUpLabels[key] || key, count]);

    document.querySelectorAll('[data-review-window]').forEach((button) => {
      const active = Number(button.dataset.reviewWindow) === days;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const set = (selector, text) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = text;
    };
    set('[data-review-period]', `${days}-day review`);
    set('[data-review-count]', String(entries.length));
    set('[data-review-themes]', listText(themes.slice(0, 5), 'No themes deliberately tagged yet.'));
    set('[data-review-outcomes]', listText(outcomes, 'No outcomes deliberately marked yet.'));
    set('[data-review-tools]', listText(tools, 'No saved tools in this period.'));
    set('[data-review-followup]', listText(followUps, 'No One Stone or Boundary follow-up marked yet.'));

    let prompt = 'Save a few reflections with optional context to make this review more useful.';
    if (entries.length && themes.length) {
      const topTheme = themes[0][0];
      const improved = entries.filter((entry) => metaFor(entry).outcome === 'improved').length;
      prompt = improved
        ? `${topTheme} appeared most often. What was different in the ${improved} entr${improved === 1 ? 'y' : 'ies'} you marked improved?`
        : `${topTheme} appeared most often. What changed across those entries, and what stayed the same?`;
    } else if (entries.length) {
      prompt = 'You have saved work in this period. Which entries feel connected, and which should remain separate?';
    }
    set('[data-review-prompt]', prompt);

    const saved = service.getPeriodicReview(days);
    const takeaway = document.querySelector('#review-takeaway');
    const next = document.querySelector('#review-next-action');
    if (takeaway) takeaway.value = saved.takeaway || '';
    if (next) next.value = saved.nextAction || '';
    set('[data-review-saved]', saved.savedAt ? `Saved ${formatDate(saved.savedAt)}` : 'No personal takeaway saved for this review window yet.');
  }

  function renderPatternLens() {
    if (page !== 'progress') return;
    const data = service.load();
    const lens = data.review?.patternLens || {};
    const entries = service.listEntries();
    const statement = document.querySelector('#pattern-lens-statement');
    const hypothesis = document.querySelector('#pattern-lens-hypothesis');
    if (statement && document.activeElement !== statement) statement.value = lens.statement || '';
    if (hypothesis && document.activeElement !== hypothesis) hypothesis.value = lens.hypothesis || '';

    const candidates = countBy(entries.flatMap((entry) => metaFor(entry).themes)).slice(0, 6);
    const candidateNode = document.querySelector('[data-lens-candidates]');
    if (candidateNode) candidateNode.textContent = candidates.length
      ? `Themes you selected most often: ${candidates.map(([theme, count]) => `${theme} (${count})`).join(' · ')}`
      : 'No member-selected themes are frequent enough to summarize yet. You can still write a lens manually.';

    const relations = lens.entryRelations || {};
    const relationCounts = countBy(Object.values(relations)).map(([key, count]) => [lensRelationLabels[key] || key, count]);
    const summary = document.querySelector('[data-lens-summary]');
    if (summary) summary.textContent = lens.statement
      ? (relationCounts.length ? listText(relationCounts, '') : 'Lens saved. Classify entries only if they genuinely belong under it.')
      : 'No Pattern Lens saved yet.';

    const list = document.querySelector('#pattern-lens-entry-list');
    if (!list) return;
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'member-empty-state';
      empty.textContent = 'Save some work first. A Pattern Lens compares entries you deliberately choose to connect.';
      list.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement('article');
      row.className = 'member-lens-entry';
      const copy = document.createElement('div');
      const tool = document.createElement('span');
      tool.textContent = entry.tool;
      const title = document.createElement('strong');
      title.textContent = entry.title || 'Saved reflection';
      const date = document.createElement('small');
      date.textContent = formatDate(entry.createdAt);
      copy.append(tool, title, date);

      const select = document.createElement('select');
      select.dataset.lensRelation = entry.id;
      [['', 'Not part of this lens'], ['supports', 'Supports this idea'], ['challenges', 'Challenges this idea'], ['exception', 'Exception'], ['unclear', 'Still unclear']].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
      select.value = relations[entry.id] || '';
      select.disabled = !lens.statement;
      row.append(copy, select);
      list.appendChild(row);
    });
  }

  if (page === 'work') {
    ['#member-work-search', '#member-work-filter', '#member-work-theme', '#member-work-outcome'].forEach((selector) => {
      const node = document.querySelector(selector);
      node?.addEventListener(node.tagName === 'INPUT' ? 'input' : 'change', renderWork);
    });
    renderWork();
  }

  if (page === 'progress') {
    document.querySelectorAll('[data-review-window]').forEach((button) => {
      button.addEventListener('click', () => renderReview(Number(button.dataset.reviewWindow) || 30));
    });
    document.querySelector('#save-review-takeaway')?.addEventListener('click', () => {
      const takeaway = document.querySelector('#review-takeaway')?.value.trim() || '';
      const nextAction = document.querySelector('#review-next-action')?.value.trim() || '';
      const result = service.savePeriodicReview(activeReviewDays, takeaway, nextAction);
      status(result.ok ? `${activeReviewDays}-day review takeaway saved on this device.` : 'Your browser blocked saving review notes.');
      renderReview(activeReviewDays);
    });
    document.querySelector('#save-pattern-lens')?.addEventListener('click', () => {
      const statement = document.querySelector('#pattern-lens-statement')?.value.trim() || '';
      const hypothesis = document.querySelector('#pattern-lens-hypothesis')?.value.trim() || '';
      if (!statement) return status('Write the pattern you want to examine before saving a Pattern Lens.');
      const result = service.setPatternLens({ statement, hypothesis });
      status(result.ok ? 'Pattern Lens saved on this device.' : 'Your browser blocked saving the Pattern Lens.');
      renderPatternLens();
    });
    document.querySelector('#clear-pattern-lens')?.addEventListener('click', () => {
      if (!window.confirm('Clear this Pattern Lens and its entry classifications from this device? Saved My Work entries will remain.')) return;
      const result = service.clearPatternLens();
      status(result.ok ? 'Pattern Lens cleared. Saved work remains.' : 'Your browser blocked clearing the Pattern Lens.');
      renderPatternLens();
    });
    renderReview(30);
    renderPatternLens();
  }

  document.addEventListener('change', (event) => {
    const theme = event.target.closest('[data-edit-theme]');
    if (theme) {
      const editor = theme.closest('[data-entry-editor]');
      const checked = editor?.querySelectorAll('[data-edit-theme]:checked') || [];
      if (checked.length > 6) {
        theme.checked = false;
        status('Choose up to 6 themes so the comparison stays useful.');
      }
      return;
    }

    const relation = event.target.closest('[data-lens-relation]');
    if (relation) {
      const result = service.setPatternLensRelation(relation.dataset.lensRelation || '', relation.value);
      status(result.ok ? 'Pattern Lens classification updated.' : 'That saved entry could not be updated.');
      renderPatternLens();
    }
  });

  document.addEventListener('click', async (event) => {
    const saveMeta = event.target.closest('[data-save-entry-meta]');
    if (saveMeta) {
      event.stopPropagation();
      const id = saveMeta.dataset.saveEntryMeta || '';
      const editor = document.querySelector(`[data-entry-editor="${CSS.escape(id)}"]`);
      if (!editor) return status('That saved entry editor could not be found.');
      const themes = Array.from(editor.querySelectorAll('[data-edit-theme]:checked')).slice(0, 6).map((input) => input.value);
      const result = service.updateEntryMeta(id, {
        themes,
        context: editor.querySelector('[data-edit-context]')?.value.trim() || '',
        outcome: editor.querySelector('[data-edit-outcome]')?.value || '',
        helped: editor.querySelector('[data-edit-helped]')?.value.trim() || '',
        changed: editor.querySelector('[data-edit-changed]')?.value.trim() || '',
        followUpStatus: editor.querySelector('[data-edit-follow-up]')?.value || '',
        followUpNote: editor.querySelector('[data-edit-follow-up-note]')?.value.trim() || ''
      });
      status(result.ok ? 'Saved comparison context updated.' : 'That saved entry could not be updated.');
      renderWork();
      return;
    }

    const copyButton = event.target.closest('[data-copy-entry]');
    if (!copyButton) return;
    event.stopPropagation();
    const entry = service.listEntries().find((item) => item.id === copyButton.dataset.copyEntry);
    if (!entry) return status('That saved entry could not be found.');
    const copied = await copyText(entryText(entry));
    status(copied ? 'Saved entry copied with its comparison context.' : 'Copy failed.');
  }, true);

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-delete-entry]')) return;
    window.setTimeout(() => {
      renderWork();
      if (page === 'progress') {
        renderReview(activeReviewDays);
        renderPatternLens();
      }
    }, 0);
  });
})();