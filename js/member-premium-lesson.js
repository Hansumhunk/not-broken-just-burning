(() => {
  'use strict';
  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const querySlug = new URLSearchParams(location.search).get('lesson') || 'father-wound';
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(querySlug) && querySlug.length <= 100 ? querySlug : 'father-wound';
  const userId = auth?.user?.id || '';
  const progressKey = userId ? 'nbjb.plus.lesson-progress.v1.' + userId : null;
  const positionKey = userId ? 'nbjb.plus.reading-position.v1.' + userId + '.' + slug : null;
  const fontKey = 'nbjb.plus.reader-font.v1';
  const el = id => document.getElementById(id);
  const main = el('premium-lesson-content');
  const notice = el('premium-lesson-status-panel');
  const audioStatus = el('premium-audio-status');
  const recordedAudio = el('premium-recorded-audio');
  const recordedStatus = el('premium-recorded-status');
  const recordedSpeed = el('premium-recorded-speed');
  let recordedSource = '';
  let audioRequestId = 0;
  let signedExpiresAt = 0;
  // Every recording is requested from the authenticated lesson API at the
  // moment this chapter is shown. The server checks membership before signing
  // a short-lived URL for our private Supabase Storage bucket.
  function authorizedAudioUrl(value) {
    const candidate = typeof value === 'string' ? value : value?.url;
    if (typeof candidate !== 'string' || candidate.length > 4096) return '';
    try {
      const u = new URL(candidate, location.origin);
      if (u.protocol !== 'https:') return '';
      if (u.origin !== location.origin &&
        !(u.hostname === 'plhbvtbvtxfzulsaxuim.supabase.co' &&
          u.pathname.startsWith('/storage/v1/object/sign/'))) return '';
      return u.href;
    } catch (_) { return ''; }
  }
  function stopRecorded() {
    if (!recordedAudio) return;
    recordedAudio.pause();
    recordedAudio.currentTime = 0;
  }
  async function syncRecordedAudio() {
    const requestId = ++audioRequestId;
    stopRecorded();
    recordedAudio.hidden = true;
    if (recordedSource) {
      recordedAudio.removeAttribute('src');
      recordedAudio.load();
      recordedSource = '';
      signedExpiresAt = 0;
    }
    if (!lesson || !auth?.client) {
      recordedStatus.textContent = 'Recording unavailable right now. Reading remains available.';
      return;
    }
    recordedStatus.textContent = 'Checking for a finished recording of this section…';
    try {
      const { data, error } = await auth.client.functions.invoke('read-flamewalker-lesson', {
        body: { action: 'audio', slug, section: current + 1 }
      });
      if (requestId !== audioRequestId) return; // Member changed chapters while fetching.
      const source = !error && data?.available ? authorizedAudioUrl(data.url) : '';
      if (!source) {
        recordedStatus.textContent = 'Natural narration for this section is being prepared. You can read it now, or expand Basic device read-aloud if you prefer.';
        return;
      }
      recordedAudio.src = source;
      recordedSource = source;
      signedExpiresAt = Date.now() + Math.min(Number(data.expires_in) || 600, 600) * 1000;
      recordedAudio.load();
      recordedAudio.hidden = false;
      recordedAudio.playbackRate = Number(recordedSpeed?.value) || 1;
      recordedStatus.textContent = 'Natural recorded narration is ready. Press Play to listen at your own pace.';
    } catch (_) {
      if (requestId === audioRequestId)
        recordedStatus.textContent = 'Could not check the recording. You can continue reading this section.';
    }
  }
  recordedSpeed?.addEventListener('change', () => {
    recordedAudio.playbackRate = Number(recordedSpeed.value) || 1;
  });
  recordedAudio?.addEventListener('play', () => {
    if (signedExpiresAt && Date.now() > signedExpiresAt - 15000) {
      recordedAudio.pause();
      recordedStatus.textContent = 'Refreshing the secure audio link. Use Play again after it appears.';
      syncRecordedAudio();
    }
  });
  recordedAudio?.addEventListener('error', () => {
    recordedStatus.textContent = 'The recording could not load. Try reselecting this section to renew its secure link.';
  });
  recordedAudio?.addEventListener('ended', () => {
    recordedStatus.textContent = 'Section finished. Choose Next section when you are ready.';
  });
  const speech = ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) ? window.speechSynthesis : null;
  const speechControls = { play: el('premium-speak'), pause: el('premium-pause'), stop: el('premium-stop') };
  const notes = new Map(); // Short-term memory only. Never automatically store or upload written answers.
  let steps = [];
  let current = 0;
  let lesson = null;
  let reading = false;
  let queue = [];
  let run = 0;
  let fontSize = 1.04;

  function storageRead(key) {
    if (!key) return null;
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function storageWrite(key, value) {
    if (!key) return false;
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }
  function completed() {
    try {
      const data = JSON.parse(storageRead(progressKey) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (_) { return {}; }
  }
  function updateProgress() {
    const done = completed();
    document.querySelectorAll('[data-premium-lesson-link]').forEach(link => {
      if (link.dataset.premiumLessonLink === slug) link.setAttribute('aria-current', 'page');
    });
    document.querySelectorAll('[data-premium-progress]').forEach(node => {
      node.textContent = done[node.dataset.premiumProgress] ? 'Practiced on this device' : 'Not yet practiced';
    });
  }
  async function loadCatalog() {
    try {
      const { data, error } = await auth.client.functions.invoke('read-flamewalker-lesson', { body: { action: 'catalog' } });
      if (error || !Array.isArray(data?.lessons)) return;
      const items = data.lessons.filter(item => item && item.track_slug === 'wounded-boy' && typeof item.slug === 'string' &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) && item.slug.length <= 100)
        .sort((a, b) => Number(a.lesson_number) - Number(b.lesson_number));
      if (!items.length) return;
      const nav = document.querySelector('.premium-track-nav');
      if (!nav) return;
      nav.replaceChildren();
      for (const item of items) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = 'member-premium-lesson.html?lesson=' + encodeURIComponent(item.slug);
        link.dataset.premiumLessonLink = item.slug;
        if (item.slug === slug) link.setAttribute('aria-current', 'page');
        const number = document.createElement('span');
        number.textContent = String(item.lesson_number).padStart(2, '0');
        const label = document.createElement('small');
        label.dataset.premiumProgress = item.slug;
        label.textContent = completed()[item.slug] ? 'Practiced on this device' :
          item.status === 'published' ? 'Available to Flamewalker+' : 'Editorial review';
        link.append(number, document.createTextNode(' ' + item.title + ' '), label);
        li.append(link);
        nav.append(li);
      }
    } catch (_) { /* Static lesson links remain. */ }
  }

  function noticeState(title, message) {
    el('premium-lesson-title').textContent = title;
    el('premium-lesson-status').textContent = message;
  }
  function appendText(container, tag, text) {
    const p = document.createElement(tag);
    p.textContent = text;
    container.appendChild(p);
  }
  function prettyHeading(s) {
    const name = String(s || 'Continue reading').replace(/\s+/g, ' ').trim();
    return name.toLowerCase().replace(/(^|[\s—–\/-])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase())
      .replace(/\bNbjb\b/g, 'NBJB');
  }
  // Use the author's actual chapter headings, never arbitrary page-number slices.
  const major = /^(?:OPENING|LESSON PURPOSE|PART \d+\b|THE (?:FATHER IMPRINT MAP|MATERNAL IMPRINT MAP|SILENCE INVENTORY|SMALLER DOOR)|NEXT HONEST ACTION|THE NEXT HONEST ACTION|OPTIONAL SPIRITUAL LENS|INTEGRATION|FINAL REFLECTION|PRIVACY NOTE|PROFESSIONAL(?:\s|\/|$))/i;
  function sectionize(blocks) {
    const output = [];
    let name = 'Opening';
    let part = [];
    let length = 0;
    let continuation = 0;
    function flush() {
      if (!part.length) return;
      output.push({ title: name, continuation, blocks: part });
      part = []; length = 0; continuation++;
    }
    for (const block of blocks.slice(0, 800)) {
      if (!block || typeof block.text !== 'string' || !block.text.trim()) continue;
      const text = block.text.trim();
      const kind = block.type === 'heading' ? 'heading' : 'paragraph';
      if (kind === 'heading' && major.test(text)) {
        flush();
        name = prettyHeading(text);
        continuation = 0;
        continue;
      }
      // Keep roughly 1–3 minutes of prose per view. Break at an existing text block.
      if (part.length && length > 900 && (length + text.length > 1800 || part.length >= 11)) flush();
      part.push({ kind, text });
      length += text.length;
    }
    flush();
    return output;
  }
  function label(step) {
    return step.continuation ? step.title + ' · continued ' + (step.continuation + 1) : step.title;
  }
  function wordCount(step) {
    const text = step.exercise ? (lesson?.content?.exercise?.prompts || []).join(' ') : step.blocks.map(b => b.text).join(' ');
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
  function estimate(step) { return Math.max(1, Math.ceil(wordCount(step) / 180)) + ' min read'; }

  function saveNote() {
    if (!steps.length || steps[current]?.exercise) return;
    const text = el('premium-pause-note').value;
    if (text.trim()) notes.set(current, text);
    else notes.delete(current);
  }
  function stopSpeech(message = 'Playback stopped.') {
    run++;
    queue = [];
    reading = false;
    if (speech) speech.cancel();
    speechControls.play.disabled = !speech;
    speechControls.pause.disabled = true;
    speechControls.pause.textContent = 'Pause';
    speechControls.stop.disabled = true;
    audioStatus.textContent = speech ? message : 'Read aloud is not supported by this browser. Reading remains available.';
  }
  function speechChunks(text) {
    const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const chunks = [];
    let chunk = '';
    for (const word of words) {
      if (chunk && (chunk.length + word.length > 160 || (chunk.length > 100 && /[.!?]$/.test(chunk)))) {
        chunks.push(chunk); chunk = '';
      }
      chunk += (chunk ? ' ' : '') + word;
      if (chunk.length >= 215) { chunks.push(chunk); chunk = ''; }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }
  function sectionSpeechText() {
    const step = steps[current];
    return step.exercise
      ? [lesson?.content?.exercise?.title || 'Guided reflection', ...(lesson?.content?.exercise?.prompts || [])].join('. ')
      : [label(step), ...step.blocks.map(b => b.text)].join('. ');
  }
  function speakChunk(token) {
    if (!speech || token !== run || !reading) return;
    const text = queue.shift();
    if (!text) { stopSpeech('Section finished. Choose Next section when you are ready.'); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = Number(el('premium-speed').value) || 1;
    utterance.onend = () => { if (token === run) speakChunk(token); };
    utterance.onerror = () => { if (token === run) stopSpeech('Audio playback stopped. Try Listen again, or continue reading.'); };
    speech.speak(utterance);
  }
  function playSpeech() {
    if (!speech || !steps.length) return;
    stopRecorded();
    stopSpeech();
    queue = speechChunks(sectionSpeechText());
    if (!queue.length) { audioStatus.textContent = 'No readable text in this section.'; return; }
    reading = true;
    speechControls.pause.disabled = false;
    speechControls.stop.disabled = false;
    audioStatus.textContent = 'Listening to this section. You can pause, stop, or move to another part.';
    speakChunk(run);
  }
  function buildExercise() {
    const exercise = lesson?.content?.exercise || {};
    el('premium-exercise-title').textContent = exercise.title || 'Guided reflection';
    const fields = el('premium-exercise-fields');
    if (fields.childElementCount) return;
    (Array.isArray(exercise.prompts) ? exercise.prompts.slice(0, 12) : []).forEach((prompt, i) => {
      if (typeof prompt !== 'string') return;
      const label = document.createElement('label');
      label.textContent = prompt;
      const textarea = document.createElement('textarea');
      textarea.id = 'premium-exercise-' + i;
      textarea.rows = 4; textarea.maxLength = 2500;
      textarea.setAttribute('autocomplete', 'off');
      label.append(textarea); fields.append(label);
    });
  }
  function render({ focus = false } = {}) {
    if (!steps.length) return;
    stopSpeech('Basic device read-aloud is ready if you choose it.');
    syncRecordedAudio();
    const step = steps[current];
    const final = Boolean(step.exercise);
    el('premium-current-step').hidden = final;
    el('premium-exercise').hidden = !final;
    if (final) {
      buildExercise();
    } else {
      el('premium-step-kicker').textContent = 'Part ' + (current + 1) + ' · ' + estimate(step);
      el('premium-step-title').textContent = label(step);
      const body = el('premium-reader-body');
      body.replaceChildren();
      step.blocks.forEach(b => appendText(body, b.kind === 'heading' ? 'h3' : 'p', b.text));
      el('premium-pause-note').value = notes.get(current) || '';
      el('premium-pause-status').textContent = '';
      el('premium-pause-reflection').open = false;
    }
    const count = steps.length;
    el('premium-step-count').textContent = 'Section ' + (current + 1) + ' of ' + count;
    el('premium-estimate').textContent = final ? 'Optional practice' : estimate(step);
    el('premium-step-position').textContent = (current + 1) + ' / ' + count;
    el('premium-progressbar').setAttribute('aria-valuemax', String(count));
    el('premium-progressbar').setAttribute('aria-valuenow', String(current + 1));
    el('premium-progress-fill').style.width = (100 * (current + 1) / count) + '%';
    el('premium-chapter-select').value = String(current);
    el('premium-prev').disabled = current === 0;
    el('premium-next').disabled = current === count - 1;
    el('premium-next').textContent = current === count - 2 ? 'Final reflection →' :
      current === count - 1 ? 'You reached the end' : 'Next section →';
    const saved = storageWrite(positionKey, String(current));
    el('premium-save-status').textContent = saved
      ? 'Reading position saved on this device. Your reflection answers are not saved or uploaded.'
      : 'Reading position cannot be saved in this browser. Reflection answers are not uploaded.';
    // Keep one lightweight return-to-lesson bookmark visible across the Hub.
    // This stores only the lesson name and chapter index, not reflection text.
    window.NBJBLearningContinuity?.record?.({
      slug,
      title: String(lesson?.title || 'Flamewalker+ lesson').slice(0, 140),
      section: current + 1,
      total: count,
      sectionTitle: String(final ? 'Guided reflection' : label(step)).slice(0, 160)
    });
    // Keep the address consistent with the visible section, so browser
    // bookmarks and links from the Hub return to exactly this part.
    const currentUrl = new URL(location.href);
    currentUrl.searchParams.set('lesson', slug);
    currentUrl.searchParams.set('section', String(current + 1));
    if (currentUrl.href !== location.href) history.replaceState(history.state, '', currentUrl.href);
    if (focus) {
      const target = final ? el('premium-exercise-title') : el('premium-step-title');
      target.setAttribute('tabindex', '-1');
      document.querySelector('.premium-reader-progress')?.scrollIntoView({ behavior: 'auto', block: 'start' });
      target.focus({ preventScroll: true });
    }
  }
  function go(next) {
    if (!Number.isInteger(next) || next < 0 || next >= steps.length) return;
    saveNote();
    current = next;
    render({ focus: true });
  }
  function buildSelector() {
    const select = el('premium-chapter-select');
    select.replaceChildren();
    steps.forEach((step, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = String(i + 1).padStart(2, '0') + ' · ' + label(step);
      select.append(option);
    });
  }
  function renderLesson(data) {
    lesson = data;
    const blocks = Array.isArray(lesson.content?.blocks) ? lesson.content.blocks : [];
    steps = [...sectionize(blocks), { title: 'Guided reflection', exercise: true, blocks: [] }];
    if (steps.length < 2) { noticeState('Lesson unavailable', 'No content sections were found.'); return; }
    notice.hidden = true;
    main.hidden = false;
    el('premium-lesson-sequence').textContent = 'Lesson ' + String(lesson.lesson_number).padStart(2, '0') +
      (lesson.status === 'editorial_review' ? ' · Private editorial preview' : ' · Published');
    el('premium-reader-heading').textContent = lesson.title || 'Member lesson';
    el('premium-reader-intro').textContent = lesson.summary || '';
    const note = document.querySelector('.premium-editorial-note');
    if (note) note.textContent = lesson.status === 'editorial_review'
      ? 'Editorial preview · Available only to the nominated internal reviewer, not released to members.'
      : 'Published material · Available only with server-authorized Flamewalker+ access.';
    buildSelector();
    const stored = Number(storageRead(positionKey));
    const requestedSection = new URLSearchParams(location.search).get('section');
    const direct = requestedSection && /^[1-9][0-9]{0,2}$/.test(requestedSection)
      ? Number(requestedSection) - 1 : null;
    // A return link can name a section directly. The lesson body is still
    // fetched through server-side membership authorization first.
    current = direct !== null && direct >= 0 && direct < steps.length
      ? direct
      : Number.isInteger(stored) && stored >= 0 && stored < steps.length ? stored : 0;
    render();
    audioStatus.textContent = speech
      ? 'Basic device read-aloud is optional. Its voice quality varies by browser and device.'
      : 'Your browser does not support basic device read-aloud. Reading remains available.';
  }
  function exerciseStatus(text, failed = false) {
    const node = el('premium-exercise-status');
    node.textContent = text;
    node.dataset.state = failed ? 'error' : 'ok';
  }

  // The reader never auto-archives reflections. Saving to My Work requires
  // a deliberate button click and writes only to this browser's member store.
  function saveReflectionToWork(text, context, resultNode) {
    const body = String(text || '').trim();
    if (!body) { resultNode.textContent = 'Write a reflection before saving.'; return; }
    const service = window.NBJBMemberService;
    if (!service?.recordToolEntry) { resultNode.textContent = 'My Work is unavailable on this device.'; return; }
    const clipped = body.slice(0, 2400);
    const saved = service.recordToolEntry('Lesson Reflection', {
      title: (lesson?.title || 'Flamewalker+') + ' · ' + context,
      summary: clipped,
      tags: ['Flamewalker+', 'Lesson reflection'],
      data: { lessonSlug: slug, section: current + 1 }
    });
    resultNode.textContent = saved.ok
      ? 'Saved to My Work on this device.' + (clipped.length < body.length ? ' Only the first 2,400 characters were saved; use Copy for the full answer.' : ' You can find it from the Hub.')
      : 'This device could not save the reflection. Use Copy to keep it privately.';
  }
  function reflectionAnswers() {
    return Array.from(el('premium-exercise-fields').querySelectorAll('label')).map(label => {
      const response = label.querySelector('textarea')?.value.trim() || '';
      return { prompt: label.firstChild?.textContent?.trim() || 'Reflection', response };
    });
  }

  el('premium-chapter-select')?.addEventListener('change', ev => go(Number(ev.currentTarget.value)));
  el('premium-prev')?.addEventListener('click', () => go(current - 1));
  el('premium-next')?.addEventListener('click', () => go(current + 1));
  el('premium-pause-note')?.addEventListener('input', saveNote);
  el('premium-pause-copy')?.addEventListener('click', async () => {
    const text = el('premium-pause-note').value.trim();
    if (!text) { el('premium-pause-status').textContent = 'Write a short note first.'; return; }
    try {
      await navigator.clipboard.writeText(text);
      el('premium-pause-status').textContent = 'Copied. Paste it somewhere you control if you want to keep it.';
    } catch (_) { el('premium-pause-status').textContent = 'Copy blocked. Select and copy the note manually.'; }
  });
  el('premium-pause-save')?.addEventListener('click', () => {
    saveReflectionToWork(el('premium-pause-note').value, String(steps[current]?.title || 'Section reflection'),
      el('premium-pause-status'));
  });
  speechControls.play?.addEventListener('click', playSpeech);
  speechControls.pause?.addEventListener('click', () => {
    if (!speech || !reading) return;
    if (speech.paused) {
      speech.resume();
      speechControls.pause.textContent = 'Pause';
      audioStatus.textContent = 'Narration resumed.';
    } else {
      speech.pause();
      speechControls.pause.textContent = 'Resume';
      audioStatus.textContent = 'Narration paused.';
    }
  });
  speechControls.stop?.addEventListener('click', () => stopSpeech());
  el('premium-speed')?.addEventListener('change', () => {
    if (reading) playSpeech(); // Restart current section at selected speed.
  });
  try {
    const stored = Number(storageRead(fontKey));
    if (Number.isFinite(stored) && stored >= .92 && stored <= 1.5) fontSize = stored;
  } catch (_) { /* Device storage is optional. */ }
  function applyFont() { el('premium-reader-body').style.setProperty('--premium-reader-font', fontSize.toFixed(2) + 'rem'); }
  el('premium-font-more')?.addEventListener('click', () => {
    fontSize = Math.min(1.5, Math.round((fontSize + .1) * 100) / 100);
    applyFont(); storageWrite(fontKey, String(fontSize));
  });
  el('premium-font-less')?.addEventListener('click', () => {
    fontSize = Math.max(.92, Math.round((fontSize - .1) * 100) / 100);
    applyFont(); storageWrite(fontKey, String(fontSize));
  });
  applyFont();
  document.addEventListener('visibilitychange', () => { if (document.hidden && speech) stopSpeech('Audio paused because you left the page.'); });
  window.addEventListener('pagehide', () => { saveNote(); stopRecorded(); if (speech) stopSpeech(); });
  el('premium-copy')?.addEventListener('click', async () => {
    const answers = reflectionAnswers();
    if (!answers.length) return exerciseStatus('No prompts are available.', true);
    try {
      await navigator.clipboard.writeText(answers.map(x => x.prompt + '\n' + (x.response || '(not answered)')).join('\n\n'));
      exerciseStatus('Copied. Nothing was uploaded. Paste your answers somewhere private to keep them.');
    } catch (_) { exerciseStatus('Copy blocked. You can manually select and copy your answers.', true); }
  });
  el('premium-save-work')?.addEventListener('click', () => {
    const answers = reflectionAnswers().filter(x => x.response);
    if (!answers.length) return exerciseStatus('Write at least one answer before saving.', true);
    const text = answers.map(x => x.prompt + '\n' + x.response).join('\n\n');
    saveReflectionToWork(text, 'Guided reflection', el('premium-exercise-status'));
  });
  el('premium-exercise-form')?.addEventListener('reset', () => exerciseStatus('Answers cleared. Nothing was uploaded.'));
  el('premium-complete')?.addEventListener('click', () => {
    if (!progressKey || el('premium-exercise').hidden) return;
    const state = completed();
    state[slug] = new Date().toISOString();
    const ok = storageWrite(progressKey, JSON.stringify(state));
    updateProgress();
    exerciseStatus(ok ? 'Lesson marked practiced on this device. Answers were not stored or uploaded.'
      : 'Unable to save the completion marker in this browser.', !ok);
  });

  async function init() {
    updateProgress();
    if (!userId || !auth?.client) {
      noticeState('Sign in required', 'Sign in with Flamewalker to view available lessons.');
      return;
    }
    await loadCatalog();
    await entitlements?.ready;
    const tier = entitlements?.load?.()?.tier;
    if (tier !== 'paid') {
      noticeState('Flamewalker+ lessons are being prepared',
        'The paid curriculum remains in editorial review. Eligible paid members can read lessons once published.');
      return;
    }
    noticeState('Checking access…', 'Your private lesson is being verified by the server.');
    try {
      const { data, error } = await auth.client.functions.invoke('read-flamewalker-lesson', { body: { slug } });
      if (error || !data?.lesson) {
        noticeState('Lesson not available yet', 'This lesson is still in review or access could not be confirmed.');
        return;
      }
      renderLesson(data.lesson);
    } catch (error) {
      console.error('premium_lesson_unavailable', error);
      noticeState('Lesson temporarily unavailable', 'Try again later. Your membership was not changed.');
    }
  }
  init().catch(error => {
    console.error('premium_lesson_initialization_failed', error);
    noticeState('Unable to load lesson', 'Please try again later.');
  });
})();
