(() => {
  const service = window.NBJBMemberService;
  if (!service) return;

  const page = document.body.dataset.memberPage || '';
  const outcomeLabels = {
    improved: 'Improved',
    mixed: 'Mixed',
    unchanged: 'Unchanged',
    harder: 'Harder',
    'still-unfolding': 'Still unfolding'
  };

  function status(message) {
    const target = document.querySelector('[data-member-status]');
    if (!target) return;
    target.textContent = message;
    window.setTimeout(() => {
      if (target.textContent === message) target.textContent = '';
    }, 3200);
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
      changed: entry.meta?.changed || ''
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
    allThemes(entries).forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme;
      option.textContent = theme;
      filter.appendChild(option);
    });
    filter.value = allThemes(entries).includes(selected) ? selected : '';
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

      if (meta.context || meta.outcome || meta.helped || meta.changed) {
        const context = document.createElement('div');
        context.className = 'member-work-context';
        const rows = [
          ['Context', meta.context],
          ['Outcome I marked', meta.outcome ? (outcomeLabels[meta.outcome] || meta.outcome) : ''],
          ['What helped', meta.helped],
          ['What changed', meta.changed]
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

      const detailEntries = Object.entries(entry.data || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined);
      if (detailEntries.length) {
        const details = document.createElement('details');
        details.className = 'member-work-details';
        const detailsSummary = document.createElement('summary');
        detailsSummary.textContent = 'View tool details';
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
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const entries = service.listEntries().filter((entry) => Number(entry.createdAt || 0) >= cutoff);
    const themes = countBy(entries.flatMap((entry) => metaFor(entry).themes));
    const outcomes = countBy(entries.map((entry) => metaFor(entry).outcome).filter(Boolean)).map(([key, count]) => [outcomeLabels[key] || key, count]);
    const tools = countBy(entries.map((entry) => entry.tool));

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
    document.querySelector('#clear-member-activity')?.addEventListener('click', () => {
      window.setTimeout(() => {
        const active = document.querySelector('[data-review-window].active');
        renderReview(Number(active?.dataset.reviewWindow) || 30);
      }, 0);
    });
    renderReview(30);
  }

  document.addEventListener('click', async (event) => {
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
        const active = document.querySelector('[data-review-window].active');
        renderReview(Number(active?.dataset.reviewWindow) || 30);
      }
    }, 0);
  });
})();