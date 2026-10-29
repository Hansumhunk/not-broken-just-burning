(() => {
  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const allowed = new Set(['father-wound', 'mother-wound', 'learned-silence']);
  const fallback = 'father-wound';
  const requested = new URLSearchParams(location.search).get('lesson') || fallback;
  const slug = allowed.has(requested) ? requested : fallback;
  const userId = auth?.user?.id || '';
  const progressKey = userId ? 'nbjb.plus.lesson-progress.v1.' + userId : null;
  const byId = (id) => document.getElementById(id);
  const title = byId('premium-lesson-title');
  const status = byId('premium-lesson-status');
  const progress = () => {
    if (!progressKey) return {};
    try {
      const value = JSON.parse(localStorage.getItem(progressKey) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };

  function updateProgressLabels() {
    const done = progress();
    document.querySelectorAll('[data-premium-lesson-link]').forEach((link) => {
      const current = link.getAttribute('data-premium-lesson-link');
      if (current === slug) link.setAttribute('aria-current', 'page');
    });
    document.querySelectorAll('[data-premium-progress]').forEach((node) => {
      const current = node.getAttribute('data-premium-progress');
      node.textContent = done[current] ? 'Practiced on this device' : 'Not yet practiced';
    });
  }
  function setState(heading, message) {
    title.textContent = heading;
    status.textContent = message;
  }
  function paragraph(parent, textValue, kind = 'p') {
    const node = document.createElement(kind);
    node.textContent = String(textValue || '');
    parent.appendChild(node);
  }
  function renderLesson(lesson) {
    const content = lesson.content || {};
    byId('premium-lesson-sequence').textContent = 'Lesson ' + String(lesson.lesson_number).padStart(2, '0');
    byId('premium-reader-heading').textContent = lesson.title || 'Member lesson';
    byId('premium-reader-intro').textContent = lesson.summary || '';
    const container = byId('premium-reader-body');
    container.replaceChildren();
    for (const block of Array.isArray(content.blocks) ? content.blocks.slice(0, 800) : []) {
      if (!block || typeof block.text !== 'string') continue;
      const kind = block.type === 'heading' ? 'h3' : 'p';
      paragraph(container, block.text, kind);
    }
    const exercise = content.exercise || {};
    byId('premium-exercise-title').textContent = exercise.title || 'Guided reflection';
    const fieldbox = byId('premium-exercise-fields');
    fieldbox.replaceChildren();
    (Array.isArray(exercise.prompts) ? exercise.prompts.slice(0, 12) : []).forEach((prompt, index) => {
      if (typeof prompt !== 'string') return;
      const label = document.createElement('label');
      label.textContent = prompt;
      const textarea = document.createElement('textarea');
      textarea.rows = 4;
      textarea.maxLength = 2500;
      textarea.id = 'premium-exercise-' + index;
      textarea.setAttribute('autocomplete', 'off');
      label.appendChild(textarea);
      fieldbox.appendChild(label);
    });
    byId('premium-lesson-content').hidden = false;
    byId('premium-exercise').hidden = false;
    setState('Lesson available', 'This lesson was delivered after authenticated server-side Flamewalker+ authorization. Your exercise answers remain on this device unless you deliberately copy them.');
  }
  function exerciseStatus(message, error = false) {
    const node = byId('premium-exercise-status');
    node.textContent = message;
    node.dataset.state = error ? 'error' : 'ok';
  }
  byId('premium-copy')?.addEventListener('click', async () => {
    const fields = Array.from(byId('premium-exercise-fields').querySelectorAll('label'));
    const lines = fields.map(label => {
      const answer = label.querySelector('textarea')?.value.trim();
      const prompt = label.firstChild?.textContent?.trim() || 'Reflection';
      return prompt + '\n' + (answer || '(not answered)');
    });
    const result = lines.join('\n\n');
    if (!result) return exerciseStatus('No exercise fields were loaded.', true);
    try {
      await navigator.clipboard.writeText(result);
      exerciseStatus('Answers copied. Paste them somewhere you control; nothing was uploaded to NBJB.');
    } catch {
      exerciseStatus('Your browser blocked copying. Select and copy your text manually.', true);
    }
  });
  byId('premium-exercise-form')?.addEventListener('reset', () => {
    exerciseStatus('Fields cleared. No reflection answers were uploaded.');
  });
  byId('premium-complete')?.addEventListener('click', () => {
    if (!progressKey || byId('premium-lesson-content').hidden) return;
    try {
      const state = progress();
      state[slug] = new Date().toISOString();
      localStorage.setItem(progressKey, JSON.stringify(state));
      updateProgressLabels();
      exerciseStatus('Lesson marked practiced on this device. Exercise answers were not saved or uploaded.');
    } catch {
      exerciseStatus('This device could not store the completion marker.', true);
    }
  });

  async function init() {
    updateProgressLabels();
    if (!userId || !auth?.client) {
      setState('Sign in required', 'Sign in through your free Flamewalker account to view membership options.');
      return;
    }
    await entitlements?.ready;
    const current = entitlements?.load?.();
    if (current?.tier !== 'paid') {
      setState('Flamewalker+ lessons are being prepared',
        'This is the developing paid curriculum. Your free Flamewalker access remains unchanged. When subscription checkout launches, published lessons will unlock only for eligible paid members.');
      return;
    }
    setState('Checking your lesson…', 'A private server is checking your current membership entitlement.');
    try {
      const { data, error } = await auth.client.functions.invoke('read-flamewalker-lesson', { body: { slug } });
      if (error || !data?.lesson) {
        setState('Lesson not released yet', 'This written lesson is still being prepared or your access could not be confirmed. No payment or membership change was made.');
        return;
      }
      renderLesson(data.lesson);
    } catch (error) {
      console.error('premium_lesson_unavailable', error);
      setState('Lesson temporarily unavailable', 'Please try again later. Your membership and locally saved work were not changed.');
    }
  }
  init().catch((error) => {
    console.error('premium_lesson_initialization_failed', error);
    setState('Unable to load lesson', 'This lesson is not available right now.');
  });
})();
