(() => {
  const service = window.NBJBMemberService;
  if (!service) return;

  const themeOptions = [
    'Work', 'Relationships', 'Family', 'Parenting', 'Money', 'Identity',
    'Boundaries', 'Conflict', 'Grief', 'Wellbeing', 'Purpose', 'Trust'
  ];

  const outcomeOptions = [
    ['', 'Not recorded'],
    ['improved', 'Improved'],
    ['mixed', 'Mixed'],
    ['unchanged', 'Unchanged'],
    ['harder', 'Harder'],
    ['still-unfolding', 'Still unfolding']
  ];

  const configs = {
    forge: {
      tool: 'The Forge',
      root: '#forge-tool',
      heading: 'Save this Forge reflection to My Work?',
      description: 'Optional. This keeps a device-local copy of the Forge reflection in your member archive so you can return to it later. It does not upload the reflection to NBJB or a server.',
      extract() {
        const field = (selector) => document.querySelector(selector)?.value.trim() || '';
        const data = {
          thought: field('#forge-thought'),
          know: field('[data-forge="know"]'),
          assume: field('[data-forge="assume"]'),
          support: field('[data-forge="support"]'),
          challenge: field('[data-forge="challenge"]'),
          pattern: field('[data-forge="pattern"]'),
          compassion: field('[data-forge="compassion"]'),
          rewrite: field('#forge-rewrite')
        };
        return { title: data.thought || data.rewrite || 'Forge reflection', summary: data.rewrite || data.thought || data.pattern, data };
      }
    },
    checkin: {
      tool: 'Flame Check-In',
      root: '#checkin-tool',
      heading: 'Save this Check-In to My Work?',
      description: 'Optional. Save this snapshot on this device so you can review what you were feeling, needing, and choosing over time.',
      extract() {
        const value = (name) => document.querySelector(`[data-checkin="${name}"]`)?.value.trim() || '';
        const data = {
          body: value('body'), emotion: value('emotion'), thought: value('thought'),
          boundary: value('boundary'), need: value('need'), next: value('next')
        };
        const summary = [
          data.emotion ? `Emotion: ${data.emotion}` : '',
          data.need ? `Need: ${data.need}` : '',
          data.next ? `Next: ${data.next}` : ''
        ].filter(Boolean).join(' · ');
        return { title: data.emotion ? `Check-In: ${data.emotion}` : (data.thought || 'Flame Check-In'), summary: summary || data.thought || data.body, data };
      }
    },
    pattern: {
      tool: 'Pattern Map',
      root: '#pattern-tool',
      heading: 'Save this Pattern Map to My Work?',
      description: 'Optional. Saving creates a device-local record so My Work can archive it and Progress can compare separate Pattern Maps over time.',
      extract() {
        const field = (selector) => document.querySelector(selector)?.value.trim() || '';
        const data = {
          event: field('#pattern-event'),
          before: field('[data-pattern="before"]'),
          after: field('[data-pattern="after"]'),
          repeat: field('[data-pattern="repeat"]'),
          changed: field('[data-pattern="changed"]'),
          evidence: field('[data-pattern="evidence"]'),
          inference: field('[data-pattern="inference"]'),
          summary: field('#pattern-summary')
        };
        return { title: data.event || 'Pattern Map reflection', summary: data.summary || data.repeat || data.event, data };
      }
    },
    boundary: {
      tool: 'Boundary Builder',
      root: '#boundary-builder',
      heading: 'Save this boundary to My Work?',
      description: 'Optional. Save the behavior, impact, boundary, and action on this device so you can revisit what you decided and whether it still fits.',
      extract() {
        const field = (selector) => document.querySelector(selector)?.value.trim() || '';
        const data = {
          behavior: field('#boundary-behavior'), impact: field('#boundary-impact'),
          boundary: field('#boundary-line'), action: field('#boundary-action')
        };
        const statement = document.querySelector('#boundary-preview')?.textContent.trim() || '';
        return { title: data.boundary || data.behavior || 'Boundary reflection', summary: statement && !statement.startsWith('Fill in') ? statement : (data.action || data.boundary || data.behavior), data };
      }
    },
    stone: {
      tool: 'One Stone',
      root: '#one-stone',
      heading: 'Save this One Stone plan to My Work?',
      description: 'Optional. Save the mountain, the next move, and what can wait so you can return later and see what happened after you chose one workable action.',
      extract() {
        const field = (selector) => document.querySelector(selector)?.value.trim() || '';
        const data = { mountain: field('#stone-mountain'), now: field('#stone-now'), later: field('#stone-later') };
        return { title: data.mountain || data.now || 'One Stone plan', summary: data.now ? `One stone now: ${data.now}` : (data.mountain || data.later), data };
      }
    },
    sacred: {
      tool: 'Six Sacred Questions',
      root: '#six-question-tool',
      heading: 'Save these Six Sacred Questions to My Work?',
      description: 'Optional. Save this worksheet on this device so you can return to the context you organized without automatically sending it anywhere.',
      extract() {
        const value = (name) => document.querySelector(`[data-sacred="${name}"]`)?.value.trim() || '';
        const data = {
          who: value('who'), what: value('what'), when: value('when'),
          where: value('where'), why: value('why'), how: value('how')
        };
        const summary = [
          data.what ? `What: ${data.what}` : '',
          data.why ? `Why: ${data.why}` : '',
          data.how ? `How: ${data.how}` : ''
        ].filter(Boolean).join(' · ');
        return { title: data.what || 'Six Sacred Questions reflection', summary: summary || data.who || data.how, data };
      }
    }
  };

  function hasContent(payload) {
    return Object.values(payload?.data || {}).some((value) => String(value || '').trim());
  }

  function flash(target, message) {
    if (!target) return;
    target.textContent = message;
    window.setTimeout(() => {
      if (target.textContent === message) target.textContent = '';
    }, 3800);
  }

  function makeField(labelText, control) {
    const label = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = labelText;
    label.append(text, control);
    return label;
  }

  function buildMetadataFields(key) {
    const wrapper = document.createElement('div');
    wrapper.className = 'member-history-meta';
    wrapper.dataset.memberMeta = key;

    const intro = document.createElement('div');
    intro.className = 'member-history-meta-intro';
    const title = document.createElement('strong');
    title.textContent = 'Add comparison context';
    const note = document.createElement('span');
    note.textContent = 'Optional. These fields make future 7 / 30 / 90-day reviews more useful without asking the system to guess what your reflection means.';
    intro.append(title, note);

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
      input.dataset.memberTheme = key;
      const text = document.createElement('span');
      text.textContent = theme;
      label.append(input, text);
      themeGrid.appendChild(label);
    });
    themes.appendChild(themeGrid);

    const fields = document.createElement('div');
    fields.className = 'member-history-meta-grid';

    const context = document.createElement('textarea');
    context.rows = 3;
    context.dataset.memberMetaContext = key;
    context.placeholder = 'What was happening around this?';

    const outcome = document.createElement('select');
    outcome.dataset.memberMetaOutcome = key;
    outcomeOptions.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      outcome.appendChild(option);
    });

    const helped = document.createElement('textarea');
    helped.rows = 3;
    helped.dataset.memberMetaHelped = key;
    helped.placeholder = 'What helped, if anything?';

    const changed = document.createElement('textarea');
    changed.rows = 3;
    changed.dataset.memberMetaChanged = key;
    changed.placeholder = 'What was different from before?';

    fields.append(
      makeField('Context', context),
      makeField('Outcome I would mark', outcome),
      makeField('What helped?', helped),
      makeField('What changed?', changed)
    );

    wrapper.append(intro, themes, fields);
    return wrapper;
  }

  function readMetadata(key, root) {
    const checked = Array.from(root.querySelectorAll(`[data-member-theme="${key}"]:checked`)).slice(0, 6);
    return {
      themes: checked.map((input) => input.value),
      context: root.querySelector(`[data-member-meta-context="${key}"]`)?.value.trim() || '',
      outcome: root.querySelector(`[data-member-meta-outcome="${key}"]`)?.value || '',
      helped: root.querySelector(`[data-member-meta-helped="${key}"]`)?.value.trim() || '',
      changed: root.querySelector(`[data-member-meta-changed="${key}"]`)?.value.trim() || ''
    };
  }

  function clearMetadata(key, root) {
    root.querySelectorAll(`[data-member-theme="${key}"]`).forEach((input) => { input.checked = false; });
    const context = root.querySelector(`[data-member-meta-context="${key}"]`);
    const outcome = root.querySelector(`[data-member-meta-outcome="${key}"]`);
    const helped = root.querySelector(`[data-member-meta-helped="${key}"]`);
    const changed = root.querySelector(`[data-member-meta-changed="${key}"]`);
    if (context) context.value = '';
    if (outcome) outcome.value = '';
    if (helped) helped.value = '';
    if (changed) changed.value = '';
  }

  function buildPanel(key, config) {
    const root = document.querySelector(config.root);
    if (!root) return null;

    const panel = document.createElement('section');
    panel.className = 'member-history-optin';
    panel.dataset.memberWorkSave = key;

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Member archive · optional';

    const heading = document.createElement('h2');
    heading.textContent = config.heading;

    const description = document.createElement('p');
    description.textContent = config.description;

    const metadata = buildMetadataFields(key);

    const consentLabel = document.createElement('label');
    consentLabel.className = 'member-history-consent';
    const consent = document.createElement('input');
    consent.type = 'checkbox';
    consent.dataset.memberWorkConsent = key;
    const consentText = document.createElement('span');
    consentText.textContent = 'I understand this stores a copy in My Work on this browser/device until I remove it or clear member data.';
    consentLabel.append(consent, consentText);

    const actions = document.createElement('div');
    actions.className = 'forge-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-primary';
    button.dataset.memberWorkButton = key;
    button.textContent = 'Save to My Work';
    const workLink = document.createElement('a');
    workLink.className = 'button button-ghost';
    workLink.href = 'member-work.html';
    workLink.textContent = 'Open My Work';
    const status = document.createElement('span');
    status.className = 'forge-status';
    status.dataset.memberWorkStatus = key;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    actions.append(button, workLink, status);

    panel.append(eyebrow, heading, description, metadata, consentLabel, actions);
    root.appendChild(panel);
    return { button, consent, status, panel };
  }

  Object.entries(configs).forEach(([key, config]) => {
    const controls = buildPanel(key, config);
    if (!controls) return;

    controls.panel.querySelectorAll(`[data-member-theme="${key}"]`).forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const selected = controls.panel.querySelectorAll(`[data-member-theme="${key}"]:checked`);
        if (selected.length > 6) {
          checkbox.checked = false;
          flash(controls.status, 'Choose up to 6 themes so the comparison stays useful.');
        }
      });
    });

    controls.button.addEventListener('click', () => {
      if (!controls.consent.checked) {
        return flash(controls.status, 'Confirm that you want this reflection stored in My Work on this device.');
      }

      const payload = config.extract();
      if (!hasContent(payload)) {
        return flash(controls.status, `Add something to ${config.tool} before saving it.`);
      }

      payload.meta = readMetadata(key, controls.panel);
      payload.tags = payload.meta.themes;

      const recent = service.listEntries(config.tool)[0];
      const sameMeta = recent && JSON.stringify(recent.meta || {}) === JSON.stringify(payload.meta || {});
      if (recent && Date.now() - recent.createdAt < 8000 && recent.summary === payload.summary && recent.title === payload.title && sameMeta) {
        return flash(controls.status, 'That same reflection was just saved.');
      }

      const result = service.recordToolEntry(config.tool, payload);
      if (result.ok) {
        controls.consent.checked = false;
        clearMetadata(key, controls.panel);
      }
      flash(controls.status, result.ok ? `${config.tool} saved to My Work on this device.` : 'Your browser blocked local saved-work storage.');
    });
  });
})();