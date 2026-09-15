(() => {
  const service = window.NBJBMemberService;
  if (!service) return;

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
        return {
          title: data.thought || data.rewrite || 'Forge reflection',
          summary: data.rewrite || data.thought || data.pattern,
          data
        };
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
        return {
          title: data.emotion ? `Check-In: ${data.emotion}` : (data.thought || 'Flame Check-In'),
          summary: summary || data.thought || data.body,
          data
        };
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
        return {
          title: data.event || 'Pattern Map reflection',
          summary: data.summary || data.repeat || data.event,
          data
        };
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
          behavior: field('#boundary-behavior'),
          impact: field('#boundary-impact'),
          boundary: field('#boundary-line'),
          action: field('#boundary-action')
        };
        const statement = document.querySelector('#boundary-preview')?.textContent.trim() || '';
        return {
          title: data.boundary || data.behavior || 'Boundary reflection',
          summary: statement && !statement.startsWith('Fill in') ? statement : (data.action || data.boundary || data.behavior),
          data
        };
      }
    },
    stone: {
      tool: 'One Stone',
      root: '#one-stone',
      heading: 'Save this One Stone plan to My Work?',
      description: 'Optional. Save the mountain, the next move, and what can wait so you can return later and see what happened after you chose one workable action.',
      extract() {
        const field = (selector) => document.querySelector(selector)?.value.trim() || '';
        const data = {
          mountain: field('#stone-mountain'),
          now: field('#stone-now'),
          later: field('#stone-later')
        };
        return {
          title: data.mountain || data.now || 'One Stone plan',
          summary: data.now ? `One stone now: ${data.now}` : (data.mountain || data.later),
          data
        };
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
        return {
          title: data.what || 'Six Sacred Questions reflection',
          summary: summary || data.who || data.how,
          data
        };
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

  function buildPanel(key, config) {
    const root = document.querySelector(config.root);
    if (!root) return null;

    if (key === 'pattern') {
      const existingButton = document.querySelector('#save-pattern-member-history');
      const existingConsent = document.querySelector('#pattern-history-consent');
      const existingStatus = document.querySelector('#pattern-history-status');
      if (existingButton && existingConsent) {
        existingButton.textContent = 'Save Pattern to My Work';
        const heading = document.querySelector('#pattern-history-title');
        if (heading) heading.textContent = config.heading;
        return { button: existingButton, consent: existingConsent, status: existingStatus };
      }
    }

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

    const label = document.createElement('label');
    const consent = document.createElement('input');
    consent.type = 'checkbox';
    consent.dataset.memberWorkConsent = key;
    const labelText = document.createElement('span');
    labelText.textContent = 'I understand this stores a copy in My Work on this browser/device until I remove it or clear member data.';
    label.append(consent, labelText);

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

    panel.append(eyebrow, heading, description, label, actions);
    root.appendChild(panel);
    return { button, consent, status };
  }

  Object.entries(configs).forEach(([key, config]) => {
    const controls = buildPanel(key, config);
    if (!controls) return;

    controls.button.addEventListener('click', () => {
      if (!controls.consent.checked) {
        return flash(controls.status, 'Confirm that you want this reflection stored in My Work on this device.');
      }

      const payload = config.extract();
      if (!hasContent(payload)) {
        return flash(controls.status, `Add something to ${config.tool} before saving it.`);
      }

      const recent = service.listEntries(config.tool)[0];
      if (recent && Date.now() - recent.createdAt < 8000 && recent.summary === payload.summary && recent.title === payload.title) {
        return flash(controls.status, 'That same reflection was just saved.');
      }

      const result = service.recordToolEntry(config.tool, payload);
      if (result.ok) controls.consent.checked = false;
      flash(controls.status, result.ok ? `${config.tool} saved to My Work on this device.` : 'Your browser blocked local saved-work storage.');
    });
  });
})();
