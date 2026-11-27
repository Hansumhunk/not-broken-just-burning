(() => {
  'use strict';
  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const querySlug = new URLSearchParams(location.search).get('lesson') || 'father-wound';
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(querySlug) && querySlug.length <= 100 ? querySlug : 'father-wound';
  const userId = auth?.user?.id || '';
  const fortressSlug = 'when-protection-becomes-a-prison';
  const fortressEdition = 'Fortress Project v1.1 (Directive 002)';
  const progressKey = userId ? 'nbjb.plus.lesson-progress.v1.' + userId : null;
  const positionKey = userId ? 'nbjb.plus.reading-position.v1.' + userId + '.' + slug : null;
  // The scenario-page layout changed, so map older device-only numeric bookmarks once.
  const scenarioLayoutKey = positionKey ? positionKey + '.scenario-layout-v1' : null;
  const caseLayoutKey = positionKey ? positionKey + '.semantic-cases-v1' : null;
  const exampleLayoutKey = positionKey ? positionKey + '.keep-examples-together-v1' : null;
  const fontKey = 'nbjb.plus.reader-font.v1';
  // A review checklist belongs to the authorized reviewer and this exact draft
  // revision. It is never a publication flag or a server-side entitlement.
  const editorialKey = userId ? 'nbjb.plus.editorial-review.v1.' + userId + '.' + slug : null;
  const el = id => document.getElementById(id);
  const main = el('premium-lesson-content');
  const notice = el('premium-lesson-status-panel');
  const audioStatus = el('premium-audio-status');
  // The entire Read to Me experience (full lesson and section-only) is paused.
  // Preserve the narration implementation for later repair, but never acquire
  // a browser voice or start playback while this feature flag is off.
  const READ_TO_ME_ENABLED = false;
  const speech = READ_TO_ME_ENABLED && ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) ? window.speechSynthesis : null;
  const speechControls = { play: el('premium-speak'), section: el('premium-speak-section'), pause: el('premium-pause'), stop: el('premium-stop') };
  const notes = new Map(); // Short-term memory only. Never automatically store or upload written answers.
  let steps = [];
  let current = 0;
  let lesson = null;
  let inlineWorkspace = null;
  let finalJournal = null;
  let reviewCatalog = [];
  let reading = false;
  let speechMode = 'all';
  let activeUtterance = null; // Keep current speech object alive until its completion callback.
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
      const tracks = ['wounded-boy', 'placeholder-wound', 'safe-room-courtroom', 'steadiness-command', 'life-rebuilt', 'sacred-laws'];
      const items = data.lessons.filter(item => item && tracks.includes(item.track_slug) && typeof item.slug === 'string' &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) && item.slug.length <= 100)
        .sort((a, b) => tracks.indexOf(a.track_slug) - tracks.indexOf(b.track_slug) ||
          Number(a.lesson_number) - Number(b.lesson_number));
      if (!items.length) return;
      reviewCatalog = items;
      renderReviewQueue();
      updateNextLesson();
      const nav = document.querySelector('.premium-track-nav');
      if (!nav) return;
      nav.replaceChildren();
      let priorTrack = '';
      for (const item of items) {
        if (item.track_slug !== priorTrack) {
          const group = document.createElement('li');
          group.className = 'premium-track-heading';
          group.textContent = item.track_slug === 'wounded-boy'
            ? 'Track 1 · The Wounded Boy and Inherited Manhood'
            : item.track_slug === 'placeholder-wound'
              ? 'Track 2 · The Placeholder Wound'
              : item.track_slug === 'safe-room-courtroom'
                ? 'Track 3 · When the Safe Room Becomes the Courtroom'
                : item.track_slug === 'steadiness-command'
                  ? 'Track 4 · Steadiness & Emotional Command'
                  : item.track_slug === 'life-rebuilt'
                    ? 'Track 5 · Rebuilding a Life That Holds'
                    : 'Track 6 · The Five Sacred Laws of Survival';
          nav.append(group);
          priorTrack = item.track_slug;
        }
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

  // The next lesson is a suggestion, not a required gate or completion award.
  // Use only server-returned, explicitly published catalog entries after the
  // current protected lesson body has been authorized.
  function nextPublishedLesson(items, currentSlug) {
    if (!Array.isArray(items)) return null;
    const published = items.filter(item => item?.status === 'published' &&
      typeof item.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug));
    const index = published.findIndex(item => item.slug === currentSlug);
    if (index === -1 || index >= published.length - 1) return null;
    const next = published[index + 1];
    return { slug: next.slug, title: String(next.title || 'Next guided lesson').slice(0, 140),
      newTrack: next.track_slug !== published[index].track_slug };
  }

  function updateNextLesson() {
    const panel = el('premium-next-lesson-panel');
    if (!panel) return;
    // The panel is not visible on a reading section or when a draft is under
    // editorial review. It is shown only after the final reflection is reached.
    const final = Boolean(lesson?.status === 'published' && steps.length &&
      current === steps.length - 1);
    panel.hidden = !final;
    if (!final) return;
    const next = nextPublishedLesson(reviewCatalog, slug);
    const heading = el('premium-next-lesson-title');
    const description = el('premium-next-lesson-description');
    const link = el('premium-next-lesson-link');
    if (next) {
      heading.textContent = next.newTrack ? 'Ready for a new learning track?' : 'Ready for your next lesson?';
      description.textContent = 'Up next: ' + next.title +
        '. You can pause here, or save and copy any reflections you want to keep before leaving.';
      link.href = 'member-premium-lesson.html?lesson=' + encodeURIComponent(next.slug);
      link.textContent = 'Continue to ' + next.title + ' →';
    } else {
      heading.textContent = 'You reached the end of this lesson.';
      description.textContent = 'Return to the published catalog when you feel ready. ' +
        'Save or copy anything you want to keep before leaving this page.';
      link.href = 'member-lessons.html';
      link.textContent = 'Browse All Published Lessons →';
    }
  }

  function noticeState(title, message) {
    el('premium-lesson-title').textContent = title;
    el('premium-lesson-status').textContent = message;
  }
  function appendText(container, tag, text, extraClass = '') {
    const p = document.createElement(tag);
    // Only the authorized Fortress reference paragraphs receive external links.
    // The visible URL remains the approved source text; no third-party request
    // occurs until the learner explicitly follows a link.
    const reference = slug === fortressSlug && tag === 'p'
      ? /^(\[\d{1,2}\][\s\S]*?)(https:\/\/\S+)$/.exec(text) : null;
    let href = null;
    if (reference) {
      try {
        const u = new URL(reference[2]);
        if (u.protocol === 'https:' && !u.username && !u.password && !u.port &&
          (u.hostname === 'doi.org' || u.hostname === 'pubmed.ncbi.nlm.nih.gov') &&
          !u.search && !u.hash) href = u.href;
      } catch (_) { /* Keep the complete source as plain text. */ }
    }
    if (href) {
      const a = document.createElement('a');
      a.href = href; a.textContent = reference[2]; a.target = '_blank';
      a.rel = 'noopener noreferrer'; a.referrerPolicy = 'no-referrer';
      p.append(document.createTextNode(reference[1]), a);
    } else p.textContent = text;
    if (extraClass) p.classList.add(extraClass);
    container.appendChild(p);
  }
  function prettyHeading(s) {
    const name = String(s || 'Continue reading').replace(/\s+/g, ' ').trim();
    return name.toLowerCase().replace(/(^|[\s—–\/-])([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase())
      .replace(/\bNbjb\b/g, 'NBJB');
  }
  // Use the author's actual chapter headings, never arbitrary page-number slices.
  const major = /^(?:OPENING|LESSON PURPOSE|PART \d+\b|THE (?:FATHER IMPRINT MAP|MATERNAL IMPRINT MAP|SILENCE INVENTORY|SMALLER DOOR)|NEXT HONEST ACTION|THE NEXT HONEST ACTION|OPTIONAL SPIRITUAL LENS|INTEGRATION|FINAL REFLECTION|PRIVACY NOTE|PROFESSIONAL(?:\s|\/|$))/i;
  // Preserve narrative integrity: a scenario or case-study is a complete
  // learning page, not a fragment of the surrounding paragraph-length page.
  // These patterns inspect private lesson blocks only after server authorization.
  function namedCaseHeading(text) {
    return /^(?:SCENARIO|WORKED SCENARIO|CASE STUDY)\s*[:—–-]\s*\S/i.test(text);
  }
  function inlineScenario(text) {
    const match = /^Scenario\s+([A-Z]|\d{1,2})\s*([:—–-])\s*/i.exec(text);
    if (!match) return null;
    const remainder = text.slice(match[0].length).trim();
    let title = 'Scenario ' + match[1].toUpperCase();
    let body = remainder;
    // An em-dash often introduces a short case title; a colon normally
    // introduces the beginning of the actual teaching paragraph.
    if (match[2] !== ':') {
      const subject = /^([^.!?]{3,115})\.\s*(.*)$/s.exec(remainder);
      if (subject) {
        title += ' — ' + subject[1].trim();
        body = subject[2];
      }
    }
    return { title, body };
  }
  function sectionize(blocks, { splitScenarios = true, keepExamplesTogether = true } = {}) {
    // Father Wound's original map/recorded-section indices remain unchanged.
    // Mother Wound's existing shorter subheading behavior is unchanged too.
    const minSplitLength = slug === 'mother-wound' ? 1200 : 900;
    const blockLimit = slug === 'mother-wound' ? 22 : 11;
    const output = [];
    let name = 'Opening';
    let parentName = 'Opening';
    let part = [];
    let length = 0;
    let continuation = 0;
    let inScenario = false;
    let inExample = false;
    function flush() {
      if (!part.length) return;
      output.push({ title: name, continuation, blocks: part });
      part = []; length = 0; continuation++;
    }
    function caseTitle(title) {
      const partNumber = /^Part\s+(\d+)\b/i.exec(parentName)?.[1];
      return partNumber ? 'Part ' + partNumber + ' · ' + title : title;
    }
    const readable = blocks.slice(0, 800);
    function exampleGroupAt(index) {
      let characters = 0;
      let count = 0;
      for (let i = index; i < readable.length; i++) {
        const item = readable[i];
        if (!item || typeof item.text !== 'string') continue;
        if (i > index && item.type === 'heading') break;
        characters += item.text.trim().length;
        count++;
      }
      return { characters, count };
    }
    for (let index = 0; index < readable.length; index++) {
      const block = readable[index];
      if (!block || typeof block.text !== 'string' || !block.text.trim()) continue;
      const text = block.text.trim();
      const kind = block.type === 'heading' ? 'heading' : 'paragraph';
      if (kind === 'heading' && (major.test(text) || (slug === 'when-protection-becomes-a-prison' && /^RESEARCH NOTES AND REFERENCES$/i.test(text)))) {
        flush();
        name = prettyHeading(text);
        parentName = name;
        continuation = 0;
        inScenario = false;
        inExample = false;
        continue;
      }
      if (splitScenarios && kind === 'heading' && namedCaseHeading(text)) {
        flush();
        name = caseTitle(prettyHeading(text));
        continuation = 0;
        inScenario = true;
        inExample = false;
        continue;
      }
      const inlineCase = splitScenarios && kind === 'paragraph' ? inlineScenario(text) : null;
      if (inlineCase) {
        flush();
        name = caseTitle(inlineCase.title);
        continuation = 0;
        inScenario = true;
        inExample = false;
        if (inlineCase.body) {
          part.push({ kind, text: inlineCase.body });
          length += inlineCase.body.length;
        }
        continue;
      }
      // A following non-case heading ends the case page. Keep that heading
      // in its original teaching block so worksheets can still detect it.
      if (inScenario && kind === 'heading') {
        flush();
        name = parentName;
        continuation = 0;
        inScenario = false;
      }
      // Treat EXAMPLE 1/2/3 plus all of each example's paragraphs as one
      // atomic reading unit. Start a new page *before* the example rather
      // than leaving its heading stranded at the end of the previous page.
      const isExampleHeading = keepExamplesTogether && kind === 'heading' &&
        /^EXAMPLE\s+\d+\b/i.test(text);
      if (isExampleHeading) {
        const group = exampleGroupAt(index);
        if (part.length && (part.length + group.count > blockLimit ||
            length + group.characters > 1800 || length > minSplitLength)) flush();
        inExample = true;
      } else if (inExample && kind === 'heading') {
        // Keep each complete example with its own body; unrelated headings
        // should resume ordinary page layout.
        flush();
        inExample = false;
      }
      // Normal pages target 1–3 minutes. Scenario/case and Example groups
      // are protected from automatic paragraph-length splits.
      if (!inScenario && !inExample && part.length && length > minSplitLength &&
          (length + text.length > 1800 || part.length >= blockLimit)) flush();
      part.push({ kind, text });
      length += text.length;
    }
    flush();
    return output;
  }
  function remapScenarioBookmark(blocks, legacyIndex, revisedSteps, legacyOptions = { splitScenarios: false, keepExamplesTogether: false }) {
    if (!Number.isInteger(legacyIndex) || legacyIndex < 0) return legacyIndex;
    const oldStep = sectionize(blocks, legacyOptions)[legacyIndex];
    if (!oldStep) return legacyIndex;
    // A legacy length-based page can contain two cases. Prefer the last
    // explicit case marker, since that is where the reader had arrived.
    const marker = oldStep.blocks.slice().reverse().find(block =>
      (block.kind === 'heading' && (namedCaseHeading(block.text) ||
        /^EXAMPLE\s+\d+\b/i.test(block.text))) ||
      (block.kind === 'paragraph' && inlineScenario(block.text)));
    if (marker) {
      // A numbered example may stay within its parent chapter title, so its
      // heading is a block instead of the step title. Match either location.
      if (marker.kind === 'heading' && /^EXAMPLE\s+\d+\b/i.test(marker.text)) {
        const sameHeading = revisedSteps.findIndex(step => step.blocks?.some(block =>
          block.kind === 'heading' && block.text.trim() === marker.text.trim()));
        if (sameHeading >= 0) return sameHeading;
      }
      const title = marker.kind === 'heading'
        ? prettyHeading(marker.text)
        : inlineScenario(marker.text).title;
      const named = revisedSteps.findIndex(step =>
        step.title === title || step.title.endsWith(' · ' + title));
      if (named >= 0) return named;
    }
    // Most old pages begin with a paragraph preserved verbatim. Resolve by
    // content, not the fragile numeric index that shifts when cases split.
    const first = oldStep.blocks.find(block => block.text)?.text;
    if (!first) return legacyIndex;
    const byText = revisedSteps.findIndex(step =>
      step.blocks?.some(block => block.text === first));
    return byText >= 0 ? byText : legacyIndex;
  }
  function displayTitle(title) {
    // Keep authoring and chapter-split metadata intact, but never show
    // "Part 2 / Part 3" numbering in a member-facing reading title.
    const clean=String(title || 'Continue reading').replace(/^Part\s+\d+\s*(?:[—–·:\-]\s*)?/i,'').trim();
    return clean || 'Continue reading';
  }
  function label(step) {
    const name = displayTitle(step.title);
    return step.continuation ? name + ' · continued ' + (step.continuation + 1) : name;
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
    activeUtterance = null;
    if (speech) speech.cancel();
    speechControls.play.disabled = !READ_TO_ME_ENABLED || !speech;
    speechControls.section.disabled = !READ_TO_ME_ENABLED || !speech;
    speechControls.pause.disabled = true;
    speechControls.pause.textContent = 'Pause';
    speechControls.stop.disabled = true;
    audioStatus.textContent = !READ_TO_ME_ENABLED
      ? 'Read to Me is temporarily unavailable. The written lesson is still available.'
      : speech ? message : 'Read aloud is not supported by this browser. Reading remains available.';
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
  function finishSpokenSection(token) {
    if (token !== run || !reading) return;
    if (speechMode === 'all' && current < steps.length - 1) {
      // This is an intentional audio advance, unlike a manual chapter change.
      // The regular reader rendering keeps bookmarks, progress and controls
      // synchronized before the next short utterance begins.
      go(current + 1);
      playSpeech('all');
      return;
    }
    stopSpeech(speechMode === 'all'
      ? 'Finished reading this lesson, including the guided reflection prompts.'
      : 'Section finished. Use Read from here to continue with the rest of the lesson.');
  }
  function speakChunk(token) {
    if (!speech || token !== run || !reading) return;
    const text = queue.shift();
    if (!text) { finishSpokenSection(token); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance;
    utterance.lang = 'en-US';
    utterance.rate = Number(el('premium-speed').value) || 1;
    // Browsers can drop an utterance if the object is collected, or fail when
    // the next utterance is enqueued synchronously in the previous onend event.
    utterance.onend = () => {
      if (token !== run) return;
      activeUtterance = null;
      window.setTimeout(() => speakChunk(token), 20);
    };
    utterance.onerror = () => {
      if (token !== run) return; // Ignore expected interruption by Stop / Next.
      activeUtterance = null;
      stopSpeech('Device read-aloud stopped. Use Read from here to restart this section.');
    };
    try { speech.speak(utterance); }
    catch (_) { stopSpeech('This browser could not continue reading aloud. Text remains available.'); }
  }
  function playSpeech(mode = 'all') {
    if (!READ_TO_ME_ENABLED || !speech || !steps.length) return;
    stopSpeech();
    speechMode = mode === 'section' ? 'section' : 'all';
    queue = speechChunks(sectionSpeechText());
    if (!queue.length) { audioStatus.textContent = 'No readable text in this section.'; return; }
    reading = true;
    speechControls.pause.disabled = false;
    speechControls.stop.disabled = false;
    audioStatus.textContent = speechMode === 'all'
      ? 'Reading from this section through the end of the lesson. Pause or Stop at any time. Voice quality depends on your device.'
      : 'Reading this section only. Pause or Stop at any time.';
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
  // Treat the manuscript's four columns as actual inline writing prompts.
  // The fields are DOM-moved rather than recreated, preserving typed answers
  // while the reader advances through Parts 10–13. No automatic persistence.
  const fatherMapFields = [
    'premium-map-received', 'premium-map-missed', 'premium-map-learned', 'premium-map-decision'
  ];
  function parkFatherMap() {
    const parking = el('premium-map-grid');
    for (const id of fatherMapFields) {
      const field = el(id)?.closest('.premium-map-field');
      if (field) parking.append(field);
    }
    for (const id of ['premium-map-actions', 'premium-map-status']) {
      const node = el(id);
      if (node) el('premium-father-map').append(node);
    }
  }
  function renderFatherMapInline(step, body, positiveInheritance) {
    // Each map column is a two-pane row: manuscript guidance on the left,
    // the original editable input on the right. Keep moving the SAME input
    // nodes as the learner progresses so answers never reset on navigation.
    function makeRow() {
      const row = document.createElement('div');
      row.className = 'premium-map-row';
      const reading = document.createElement('div');
      reading.className = 'premium-map-reading';
      const writing = document.createElement('div');
      writing.className = 'premium-map-writing';
      row.append(reading, writing);
      body.append(row);
      return { reading, writing };
    }
    function placeColumn(column, row) {
      const field = el(fatherMapFields[column - 1])?.closest('.premium-map-field');
      if (field) row.writing.append(field);
    }
    function renderBlock(target, block) {
      appendText(target, block.kind === 'heading' ? 'h3' : 'p', block.text,
        block.kind === 'paragraph' && /^(?:and|or):?$/i.test(block.text.trim()) ? 'premium-prose-connector' : '');
    }

    if (positiveInheritance) {
      const row = makeRow();
      step.blocks.forEach(block => renderBlock(row.reading, block));
      placeColumn(1, row);
    } else if (step.continuation >= 2) {
      appendText(body, 'p', 'Review your answers below. Update anything you want, then Copy or Save the map.',
        'premium-map-continuity');
      step.blocks.forEach(block => renderBlock(body, block));
      const names = ['What I received', 'What I missed', 'What I learned', 'What I choose now'];
      for (let n = 1; n <= 4; n++) {
        const row = makeRow();
        appendText(row.reading, 'h3', 'Column ' + n + ' — ' + names[n - 1]);
        appendText(row.reading, 'p', 'Your response carries forward from the earlier map sections.');
        placeColumn(n, row);
      }
    } else {
      let active = null;
      for (const block of step.blocks) {
        const heading = block.kind === 'heading' ? block.text.trim() : '';
        const match = /^COLUMN\s+([1-4])\b/i.exec(heading);
        if (match) {
          active = makeRow();
          renderBlock(active.reading, block);
          placeColumn(Number(match[1]), active);
        } else if (active && /^EXAMPLE\s+\d+/i.test(heading)) {
          // Worked examples are illustrations, not more fields to complete.
          active = null;
          renderBlock(body, block);
        } else if (step.continuation === 1 && /^Then mark each statement:/i.test(block.text.trim())) {
          // Column 3's classification instructions continue on the next page;
          // bring the same editable Column 3 box alongside this explanation.
          active = makeRow();
          renderBlock(active.reading, block);
          placeColumn(3, active);
        } else {
          renderBlock(active ? active.reading : body, block);
        }
      }
    }

    // Save/Copy appear once at the end of the current map view, outside the
    // right-hand answer pane. Neither action runs automatically.
    body.append(el('premium-map-actions'), el('premium-map-status'));
  }


  // Use the writing task actually delivered by the protected lesson, rather
  // than repeating an unrelated, generic reflection question on every page.
  // Read prompts from the *authorized section's* teaching text instead of
  // displaying an unrelated generic writing invitation. The manuscript stays
  // in the protected database; this script stores no lesson text or answers.
  function contextualReflectionCue(step, blocks) {
    const lines = blocks.flatMap(block => String(block.text || '').split('\n'))
      .map(line => line.trim()).filter(Boolean);
    const clean = text => String(text || '').trim()
      .replace(/^[“"‘']+/, '').replace(/[”"’']+$/, '').trim();
    const isStandaloneQuestion = text => {
      const value = clean(text);
      return value.length <= 290 && /\?$/.test(value) &&
        /^(?:What|Which|How|Why|Who|When|Where|If|Do|Did|Can|Could|Should|Would|Is|Are)\b/i.test(value);
    };
    const isSentenceStarter = text => {
      const value = clean(text);
      return value.length <= 290 && /(?:_{3,}|\.{3}|…)/.test(value) &&
        /^(?:One thing|I |My |The rule|Something I )/i.test(value);
    };

    // Lesson authors place the actual sentence directly below lead-ins such as
    // "answer only" and "a grounded spiritual question is". Keep that sentence,
    // including the fill-in blank, as the response-field label.
    for (let i = 0; i < lines.length; i++) {
      if (!/(?:answer only\s*:|(?:grounded\s+)?spiritual question is\s*:|(?:reflect(?:ion)?\s+question|ask yourself)\s*:)/i.test(lines[i])) continue;
      const follow = lines.slice(i + 1, i + 4).find(line =>
        isStandaloneQuestion(line) || isSentenceStarter(line));
      if (follow) return { instruction: clean(follow), kind: 'direct' };
    }
    // The small, achievable "Smaller Door" exercises are framed as a single
    // quoted sentence to finish. That sentence IS the writing instruction.
    if (/smaller door/i.test(step?.title || '')) {
      const starter = lines.find(isSentenceStarter);
      if (starter) return { instruction: clean(starter), kind: 'direct' };
    }
    if (/optional spiritual lens/i.test(step?.title || '')) {
      const question = lines.find(isStandaloneQuestion);
      if (question) return { instruction: clean(question), kind: 'direct' };
    }

    // One opening contrasts dramatic labels with the inherited relationship
    // rule that is observable in adult behavior. Ask the member about their
    // own pattern, rather than asking them to write a generic private note.
    if (slug === 'mother-wound' &&
        /opening/i.test(step?.title || '') &&
        lines.some(line => /(?:adult question|which rule).{0,100}(?:behavior|behave)/i.test(line))) {
      return {
        instruction: 'What rule about love or closeness did I learn growing up, and where do I see it shaping my behavior or relationships today?',
        kind: 'contextual'
      };
    }
    // Where a section contains a real standalone question, let that specific
    // question guide the writing rather than a stock prompt.
    const questions = lines.filter(isStandaloneQuestion);
    if (questions.length) {
      return { instruction: clean(questions[questions.length - 1]), kind: 'direct' };
    }
    // A section may have a parent chapter title that says "Three Scenarios"
    // while its *actual teaching* is a different topic. Work from the most
    // recent authorized prose and the innermost heading, not the chapter name.
    const prose = blocks.filter(block => block.kind !== 'heading')
      .map(block => block.text).join('\n');
    const recent = prose.slice(-1900);
    const subheading = blocks.filter(block => block.kind === 'heading')
      .map(block => block.text.trim()).filter(Boolean).pop() || '';
    const context = (subheading + '\n' + recent).toLowerCase();

    // These questions are tied to observable patterns and decisions in the
    // reading. Match specific concepts before broader ones. The original
    // manuscript and any authored question remain protected on the server.
    const grounded = [
      [/admission price for being loved|reclaiming your position|measure (?:their |your |our )?worth through usefulness|worth through usefulness/i,
        'When have I felt I needed to earn love or attention by being useful, solving problems, or providing more? What need could I name directly instead of trying to prove my worth?'],
      [/feeling like a placeholder|placeholder wound|merely a placeholder/i,
        'When did I first feel like a placeholder rather than a chosen partner? What happened, what was my first thought, and what did I need to hear or ask for?'],
      [/over.functioning|become indispensable|another bill|promise a bigger house/i,
        'When uncertainty makes me want to do more, what am I afraid might happen if I stop? What honest conversation could replace one extra task or sacrifice?'],
      [/invisible (?:work|labor)|caregiving, appointments|mental load/i,
        'Whose contributions have I been counting, and whose have I overlooked—including my own? What specific conversation could help us divide the load more fairly?'],
      [/medical crisis|illness, grief|reduced (?:capacity|intimacy)/i,
        'When someone has less energy for closeness, how can I distinguish a difficult season from a recurring lack of care? What small, realistic request could I make?'],
      [/reciprocity|keeping score|balanced ledger|one.sided effort/i,
        'Where am I measuring a relationship by who does more, and what would genuine reciprocity look like in our daily choices rather than on a scoreboard?'],
      [/inherited closeness|chosen closeness|approval seemed to require|relationship rules/i,
        'What rule about closeness or approval did I learn early in life? Where does it still shape my relationships, and what healthier rule would I choose now?'],
      [/boundary|boundaries|respectful no|say no without/i,
        'Where have I agreed to something that crossed one of my limits? What clear, respectful boundary could I state and follow through on?'],
      [/feelings? (?:of )?shame|shame (?:can|does|often)|self.blame/i,
        'When shame shows up, what story do I start telling about myself? What responsibility is actually mine, and what judgment can I put down?'],
      [/silence|stayed quiet|speak up|using (?:your|my) voice/i,
        'When have I stayed quiet to keep the peace, and what did it cost me? What is one honest thing I could say without turning the conversation into a fight?'],
      [/\btrust\b|betrayal|repair trust/i,
        'What specific behavior has affected my trust, and what observable action—not a promise or assumption—would help me decide whether trust can be rebuilt?'],
      [/father|mother|caregiver|parenting|fatherhood/i,
        'Which rule or habit did I learn from the adults who raised me, where do I notice it now, and what do I want to carry forward or change?'],
      [/integration|put into practice/i,
        'Which lesson from the passage can I recognize in my own behavior, and what would practicing a healthier response look like in one real situation?'],
      [/next honest action|one realistic action/i,
        'What one action can I take this week to apply the specific idea I just read, and how will I recognize that I followed through?']
    ];
    for (const [pattern, question] of grounded) {
      if (pattern.test(context)) return { instruction: question, kind: 'contextual' };
    }

    // Never fall back to "As I consider [chapter title] ..." again.
    // When an author has not supplied an explicit exercise, quote a real
    // sentence from the teaching so the member can respond to the content
    // directly. Future editorial passes can replace this with authored cues.
    const sentences = recent.replace(/\s+/g, ' ').trim()
      .split(/(?<=[.!?])\s+/)
      .map(text => text.replace(/^[“"‘']+|[”"’']+$/g, '').trim())
      .filter(text => text.length >= 35 && text.length <= 220 && !/^\s*(?:example|part \d+)\b/i.test(text));
    const anchor = sentences.length
      ? sentences[sentences.length - 1]
      : recent.replace(/\s+/g, ' ').trim().slice(0, 170);
    if (anchor) {
      const followup = /\b(?:need|care|support|ask|request)\b/i.test(anchor)
        ? 'Which need comes to mind for me, and how could I express it directly in a real situation?'
        : /\b(?:choose|choice|action|do differently|change|practice)\b/i.test(anchor)
          ? 'What concrete choice would I make in a similar moment, and what might get in the way?'
          : 'Where have I noticed this in my own behavior or relationships? What specific experience comes to mind?';
      return { instruction: 'The reading says: “' + anchor +
        '”\n' + followup, kind: 'grounded' };
    }
    // If the source has genuinely no readable teaching, do not invent a
    // reflection merely to fill the interface.
    return null;
  }

  function sectionReflectionCue(step) {
    // Work only with already-authorized lesson blocks. The actual task, not a
    // stock prompt, must be shown beside the member's response area.
    const blocks=(step?.blocks||[]).filter(block=>block &&
      typeof block.text==='string' && block.text.trim()).map(block=>({
      kind:block.kind==='heading'?'heading':'paragraph',text:block.text.trim()
    }));
    if(!blocks.length)return null;
    const reflectionIndex=blocks.findIndex(block =>
      (block.kind==='heading' && /^REFLECTION$/i.test(block.text)) ||
      (block.kind==='paragraph' && /^REFLECTION(?:\s*\n|$)/i.test(block.text)));
    // Explicit REFLECTION sections often give a starter phrase followed by
    // “or:” and a second option. Never stop after only two prompt lines.
    if(reflectionIndex>=0){
      const first=blocks[reflectionIndex];
      const parts=[];
      const inline=first.kind==='paragraph' ?
        first.text.replace(/^REFLECTION\s*(?:\n|$)/i,'').trim() : '';
      if(inline)parts.push(inline);
      for(let i=reflectionIndex+1;i<blocks.length && parts.length<7;i++){
        const next=blocks[i];
        if(next.kind==='heading' || /^(?:ASK:|THEN ASK:|PART \d+)/i.test(next.text))break;
        if(parts.join('\n\n').length+next.text.length>1800)break;
        // This is the reflection instruction, not later unrelated chapter prose.
        parts.push(next.text);
      }
      if(parts.length)return {instruction:parts.join('\n\n'),kind:'assignment'};
    }
    const entries=[];
    let hasQuestionCue=false;
    const add=text=>{
      const clean=String(text||'').trim();
      if(clean && !entries.includes(clean) &&
         entries.join('\n\n').length+clean.length<3000)entries.push(clean);
    };
    const isQuestion=text=>/^(?:[-•]\s+|\d{1,2}[.)]\s+).+\?/s.test(text) ||
      /^(?:What|Who|How|Why|When|Where|Which|Did|Do|Does|Can|Could|Would|Should|Is|Are|Was|Were|Am|If)\b[^.]{3,260}\?/i.test(text);
    const action=/^(?:Write|List|Name|Record|Identify|Describe|Answer|Complete|Compare|Map|Choose|Reflect\s+on)\b/i;
    const isLabel=text=>/^(?:or:|and:|what i |what the |my |“|")/i.test(text);
    for(let i=0;i<blocks.length;i++){
      const block=blocks[i];
      if(block.kind==='heading')continue;
      const text=block.text;
      if(/^(?:(?:THEN\s+)?ASK|PROMPTS?):/i.test(text)){
        hasQuestionCue=true;
        const parts=[text];
        if(/^(?:(?:THEN\s+)?ASK|PROMPTS?):\s*$/i.test(text)){
          for(let j=i+1;j<blocks.length && j<i+18;j++){
            const next=blocks[j];
            if(next.kind==='heading' || !isQuestion(next.text))break;
            parts.push(next.text);
          }
        }
        add(parts.join('\n'));
      }else if(action.test(text)){
        // “Write two columns:” is followed by their actual labels. Retain
        // the labels instead of making the member guess what to write.
        const parts=[text];
        const needsFollowing=/:\s*$/.test(text) ||
          /^(?:Write|List|Name)\s+(?:a few|\d+(?:[–-]\d+)?|two|three|four|five)\b/i.test(text);
        if(needsFollowing){
          for(let j=i+1;j<blocks.length && j<i+8 && parts.length<6;j++){
            const next=blocks[j];
            if(next.kind==='heading' || next.text.length>240 ||
               /^(?:(?:THEN\s+)?ASK|PROMPTS?|REFLECTION):/i.test(next.text))break;
            if(next.text==='or:' || isLabel(next.text) ||
               /^[A-Z][^.?!]{4,130}[.?!]?$/.test(next.text))parts.push(next.text);
            else break;
          }
        }
        add(parts.join('\n\n'));
      }else if(/^(?:Practice:|Your turn:)\s*\S/i.test(text)){
        add(text);
      }
      // A distinct “Six Questions” section can introduce its prompts
      // inside a longer teaching paragraph rather than at its start.
      if(!entries.length && /\bAsk:\s+\S/i.test(text) &&
          blocks.some(b=>b.kind==='heading' && /\bQUESTIONS?\b/i.test(b.text))){
        const where=text.search(/\bAsk:\s+\S/i);
        hasQuestionCue=true;
        add(text.slice(where));
      }
    }
    const meaningful = entries.filter(text => !/^(?:Choose one|Finish these|Answer these)\.?$/i.test(text.trim()));
    return meaningful.length
      ? {instruction:meaningful.join('\n\n'),kind:hasQuestionCue?'questions':'assignment'}
      : contextualReflectionCue(step, blocks);
  }
  function applySectionReflection(step) {
    const cue=sectionReflectionCue(step);
    const panel=el('premium-pause-reflection');
    const heading=el('premium-pause-heading');
    const hint=el('premium-pause-hint');
    const prompt=el('premium-pause-label');
    const response=el('premium-pause-note');
    if(!panel || !heading || !hint || !prompt || !response) return;
    if (!cue) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    heading.textContent='Reflect on this section';
    hint.textContent=cue.kind === 'direct' || cue.kind === 'questions' || cue.kind === 'assignment'
      ? 'Based on this section’s actual question · your choice to save'
      : 'Grounded in this reading · optional · saved only when you choose';
    prompt.textContent=cue.instruction;
    response.rows=cue.kind === 'contextual' || cue.kind === 'grounded' ? 5 : 9;
    response.placeholder='Answer the reflection above in your own words. Nothing is uploaded automatically.';
    panel.open=cue.kind !== 'contextual' && cue.kind !== 'grounded';
  }

  function render({ focus = false } = {}) {
    if (!steps.length) return;
    stopSpeech('Read from here to listen to the rest of the lesson using your device voice.');
    const step = steps[current];
    const final = Boolean(step.exercise);
    // Restore answer fields to their hidden, stable parking area before
    // replacing section prose; typed values remain in the same DOM nodes.
    parkFatherMap();
    inlineWorkspace?.park();
    finalJournal?.park();
    const onFatherMap = slug === 'father-wound' && /father imprint map/i.test(step.title) && !final;
    const onPositiveInheritance = slug === 'father-wound' && /^part 8\b/i.test(step.title) && !final;
    const isFatherPractice = onFatherMap || onPositiveInheritance;
    const isStructuredPractice = Boolean(inlineWorkspace?.matches(step));
    const isFinalJournal = Boolean(finalJournal?.matches(step)) && !isStructuredPractice;
    el('premium-father-map-guide').hidden = !onFatherMap;
    el('premium-father-positive-guide').hidden = !onPositiveInheritance;
    el('premium-father-map').hidden = true;
    el('premium-pause-reflection').hidden = isFatherPractice || isStructuredPractice || isFinalJournal || final;
    el('premium-current-step').hidden = final;
    el('premium-exercise').hidden = !final;
    const worksheetReview = el('premium-worksheet-review');
    if (worksheetReview) worksheetReview.hidden = true;
    if (final) {
      buildExercise();
      el('premium-exercise-form').hidden = Boolean(inlineWorkspace?.replacesGuidedReflection);
      inlineWorkspace?.renderCompletion?.(worksheetReview);
    } else {
      el('premium-step-kicker').textContent = 'Reading · ' + estimate(step);
      el('premium-step-title').textContent = label(step);
      const body = el('premium-reader-body');
      body.classList.toggle('premium-map-layout', isFatherPractice || isStructuredPractice);
      body.replaceChildren();
      // For map lessons, place each real input immediately after the explanation
      // of its column, not at the very bottom or on a separate reflection page.
      if (isFatherPractice) renderFatherMapInline(step, body, onPositiveInheritance);
      else if (isStructuredPractice) inlineWorkspace.render(step, body, appendText);
      else if (isFinalJournal) finalJournal.render(step, body, appendText);
      else step.blocks.forEach(b => {
        // Multiple thoughts inside one authorized paragraph (for example,
        // scenario → explanation → question) should display as real paragraphs.
        const segments = b.kind === 'paragraph' ? b.text.split(/\n\s*\n/) : [b.text];
        segments.forEach(text => appendText(body, b.kind === 'heading' ? 'h3' : 'p',
          b.kind === 'heading' ? displayTitle(text) : text,
          b.kind === 'paragraph' && /^(?:and|or):?$/i.test(text.trim()) ? 'premium-prose-connector' : ''));
      });
      el('premium-pause-note').value = notes.get(current) || '';
      el('premium-pause-status').textContent = '';
      if(!isFatherPractice && !isStructuredPractice && !isFinalJournal) applySectionReflection(step);
      else el('premium-pause-reflection').open = false;
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
    updateNextLesson();
    const saved = storageWrite(positionKey, String(current));
    if (saved && slug === 'red-flags-and-responsibility') storageWrite(scenarioLayoutKey, 'one-scenario-per-page');
    if (saved) storageWrite(caseLayoutKey, 'semantic-cases-v1');
    if (saved) storageWrite(exampleLayoutKey, 'complete-examples-v1');
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
  // The companion is built exclusively from the server-authorized lesson.
  // No workbook content, private file URL or personal answers are bundled here.
  function installFortressCompanion(data, workbookAvailable) {
    if (slug !== fortressSlug || data?.slug !== fortressSlug ||
        data?.content?.sourceEdition !== fortressEdition ||
        data?.content?.workbook?.slug !== 'fortress-audit' ||
        !Array.isArray(data.content.workbook.blocks) || !el('premium-exercise')) return;
    const panel = document.createElement('section');
    panel.className = 'premium-final-reflection';
    panel.id = 'premium-fortress-companion';
    panel.setAttribute('aria-labelledby', 'premium-fortress-companion-title');
    const title = document.createElement('h2');
    title.id = 'premium-fortress-companion-title';
    title.textContent = data.content.workbook.title || 'Companion workbook';
    panel.append(title);
    appendText(panel, 'p', 'Optional practice. Use a fictional example, write privately, skip questions or maintain a necessary restriction. Nothing is required for completion.');
    const status = document.createElement('p');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    let active = true;
    let url = null;
    let button = null;
    const cleanup = () => {
      if (url) { URL.revokeObjectURL(url); url = null; }
    };
    const deactivate = () => {
      active = false; cleanup();
      panel.hidden = true;
      if (button) button.disabled = true;
    };
    window.addEventListener('pagehide', deactivate);
    // Existing member-bootstrap verifies/redirects on restored pages; don't
    // re-enable a stale candidate panel or a pending download on restoration.
    auth.onChange?.(({user}) => { if (!user || user.id !== userId) deactivate(); });
    if (workbookAvailable === true) {
      button = document.createElement('button');
      button.type = 'button'; button.className = 'button button-ghost';
      button.textContent = 'Download blank workbook (PDF)';
      panel.append(button, status);
      button.addEventListener('click', async () => {
        if (!active || button.disabled || auth.user?.id !== userId) return;
        button.disabled = true; status.textContent = 'Checking current workbook access…';
        try {
          // Only the slug/action leaves the browser. No responses, notes, or
          // storage key. Server rechecks status, entitlement and file hash.
          const {data: bytes, error} = await auth.client.functions.invoke('read-flamewalker-lesson',
            { body: { slug, action: 'workbook' } });
          if (!active || auth.user?.id !== userId) return;
          if (error || !(bytes instanceof Blob) || bytes.size !== 182857) throw Error('unavailable');
          cleanup();
          url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url; link.download = 'The-Fortress-Audit.pdf';
          link.hidden = true; panel.append(link);
          link.click(); link.remove();
          status.textContent = 'Download requested. Keep your completed copy somewhere you control.';
          const issued = url;
          window.setTimeout(() => { if (url === issued) cleanup(); }, 15000);
        } catch (_) {
          if (active) status.textContent = 'Workbook download unavailable. Use the optional text version below, or try again later.';
        } finally {
          if (active && auth.user?.id === userId) button.disabled = false;
        }
      });
    }
    const textVersion = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Read the accessible workbook text';
    textVersion.append(summary);
    for (const block of data.content.workbook.blocks.slice(0, 300)) {
      if (!block || typeof block.text !== 'string' || !block.text.trim()) continue;
      appendText(textVersion, block.type === 'heading' ? 'h3' : 'p', block.text);
    }
    panel.append(textVersion);
    const knowledge = document.createElement('details');
    const knowledgeSummary = document.createElement('summary');
    knowledgeSummary.textContent = 'Optional understanding checks (unscored)';
    knowledge.append(knowledgeSummary);
    const checks = Array.isArray(data.content.comprehension) ? data.content.comprehension.slice(0, 8) : [];
    for (const check of checks) {
      if (!check || typeof check.question !== 'string' || typeof check.answer !== 'string') continue;
      const item = document.createElement('details');
      const question = document.createElement('summary');
      question.textContent = check.question;
      item.append(question);
      appendText(item, 'p', check.answer);
      knowledge.append(item);
    }
    if (checks.length) panel.append(knowledge);
    const related = document.createElement('details');
    const relatedSummary = document.createElement('summary');
    relatedSummary.textContent = 'Related lessons · optional';
    related.append(relatedSummary);
    const list = document.createElement('ul');
    for (const [id, label] of [
      ['boundaries-without-cruelty','Boundaries Without Cruelty'],
      ['grieving-future-never-happened','Grieving the Future That Never Happened'],
      ['what-comes-after-survival-adaptations','What Comes After: Survival Adaptations'],
      ['brotherhood-without-dependency','Brotherhood Without Dependency'],
      ['the-integrated-man-thirty-day-map','The Integrated Man']
    ]) {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = 'member-premium-lesson.html?lesson=' + encodeURIComponent(id);
      a.textContent = label; li.append(a); list.append(li);
    }
    related.append(list); panel.append(related);
    el('premium-exercise').before(panel);
  }
  function renderLesson(data) {
    lesson = data;
    const reviewPanel = el('premium-editorial-review');
    if (reviewPanel) {
      // The server never returns an editorial_review body except to the
      // nominated reviewer. Never reveal these controls based on a browser flag.
      reviewPanel.hidden = lesson.status !== 'editorial_review';
      if (!reviewPanel.hidden) hydrateEditorialReview();
    }
    const blocks = Array.isArray(lesson.content?.blocks) ? lesson.content.blocks : [];
    steps = [...sectionize(blocks), { title: 'Guided reflection', exercise: true, blocks: [] }];
    // Protected draft prompts are supplied only after authenticated access to
    // this lesson succeeds. No editorial text is bundled in public scripts.
    // Final Reflection paragraphs that say "Finish these:" are rendered as
    // small prompt/answer pairs. Save builds a single private journal entry;
    // the source prompts arrive only with the authorized protected lesson.
    finalJournal = window.NBJBFinalReflectionJournal?.create?.({
      parking: el('premium-workspace-parking'),
      lessonTitle: lesson.title,
      saveJournal: (entry, status) => saveFinalReflectionJournal(entry, status)
    }) || null;
    inlineWorkspace = window.NBJBEditorialWorkbooks?.create?.({
      slug,
      parking: el('premium-workspace-parking'),
      steps,
      exercise: lesson.content?.exercise,
      lessonTitle: lesson.title,
      saveWholeToWork: (text, context, status) => saveCompleteWorksheetToWork(text, context, status)
    }) || window.NBJBPremiumWorkspaces?.create?.({
      slug,
      parking: el('premium-workspace-parking'),
      saveToWork: (text, context, status) => saveReflectionToWork(text, context, status),
      saveWholeToWork: (text, context, status) => saveCompleteWorksheetToWork(text, context, status),
      getFinalResponses: () => reflectionAnswers()
    }) || null;
    const promptLabel = el('premium-editorial-prompt-label');
    const promptCount = Array.isArray(lesson.content?.exercise?.prompts) ? lesson.content.exercise.prompts.length : 0;
    if (promptLabel) promptLabel.textContent = promptCount + (promptCount === 1 ? ' reflection prompt' : ' reflection prompts');
    if (steps.length < 2) { noticeState('Lesson unavailable', 'No content sections were found.'); return; }
    notice.hidden = true;
    main.hidden = false;
    const trackLabel = lesson.track_slug === 'wounded-boy'
      ? 'Track 1 · The Wounded Boy and Inherited Manhood'
      : lesson.track_slug === 'placeholder-wound'
        ? 'Track 2 · The Placeholder Wound'
        : lesson.track_slug === 'safe-room-courtroom'
          ? 'Track 3 · When the Safe Room Becomes the Courtroom'
          : lesson.track_slug === 'steadiness-command'
            ? 'Track 4 · Steadiness & Emotional Command'
            : lesson.track_slug === 'life-rebuilt'
              ? 'Track 5 · Rebuilding a Life That Holds'
              : 'Track 6 · The Five Sacred Laws of Survival';
    el('premium-lesson-sequence').textContent = trackLabel + ' · Lesson ' +
      String(lesson.lesson_number).padStart(2, '0') +
      (lesson.status === 'editorial_review' ? ' · Private editorial preview' : ' · Published');
    el('premium-reader-heading').textContent = lesson.title || 'Member lesson';
    el('premium-reader-intro').textContent = lesson.summary || '';
    const note = document.querySelector('.premium-editorial-note');
    if (note) note.textContent = lesson.status === 'editorial_review'
      ? 'Editorial preview · Available only to the nominated internal reviewer, not released to members.'
      : 'Published material · Available only with server-authorized Flamewalker+ access.';
    buildSelector();
    const previousPosition = storageRead(positionKey);
    let stored = Number(previousPosition);
    const requestedSection = new URLSearchParams(location.search).get('section');
    let direct = requestedSection && /^[1-9][0-9]{0,2}$/.test(requestedSection)
      ? Number(requestedSection) - 1 : null;
    const priorSemanticLayout = storageRead(caseLayoutKey) === 'semantic-cases-v1';
    const priorRedFlagsLayout = slug === 'red-flags-and-responsibility' &&
      storageRead(scenarioLayoutKey) === 'one-scenario-per-page';
    const priorExampleLayout = storageRead(exampleLayoutKey) === 'complete-examples-v1';
    if (previousPosition !== null && !priorExampleLayout &&
        (slug === 'father-wound' || slug === 'mother-wound') && priorSemanticLayout) {
      // Existing section numbers used to split worked examples mid-page.
      const oldLayout = { splitScenarios: true, keepExamplesTogether: false };
      stored = remapScenarioBookmark(blocks, stored, steps, oldLayout);
      if (direct !== null) direct = remapScenarioBookmark(blocks, direct, steps, oldLayout);
    } else if (previousPosition !== null && !priorSemanticLayout && !priorRedFlagsLayout) {
      stored = remapScenarioBookmark(blocks, stored, steps);
      if (direct !== null) direct = remapScenarioBookmark(blocks, direct, steps);
    }
    // A return link can name a section directly. The lesson body is still
    // fetched through server-side membership authorization first.
    current = direct !== null && direct >= 0 && direct < steps.length
      ? direct
      : Number.isInteger(stored) && stored >= 0 && stored < steps.length ? stored : 0;
    render();
    audioStatus.textContent = !READ_TO_ME_ENABLED
      ? 'Read to Me is temporarily unavailable. Written lessons and guided exercises remain available.'
      : speech
        ? 'Read from here to listen across every remaining section, including the final reflection prompts. Device voice quality varies.'
        : 'This browser does not support device read-aloud. All lesson text remains available.';
  }
  const editorialItems = ['tone', 'boundaries', 'exercises', 'accuracy', 'proofreading'];
  function editorialChecks() {
    return editorialItems.filter(item => el('premium-review-' + item)?.checked);
  }
  function hydrateEditorialReview() {
    let record = null;
    try { record = JSON.parse(storageRead(editorialKey) || 'null'); } catch (_) { /* no prior notes */ }
    // Edits to a manuscript invalidate earlier review checks for that revision.
    const currentRevision = String(lesson?.updated_at || '');
    const matching = record && record.revision === currentRevision;
    const checks = matching && Array.isArray(record.checks) ? record.checks : [];
    for (const item of editorialItems) el('premium-review-' + item).checked = checks.includes(item);
    el('premium-editorial-notes').value = matching ? String(record.notes || '').slice(0, 4000) : '';
    el('premium-editorial-status').textContent = matching
      ? 'Review notes recovered for this manuscript revision. Nothing has been published.'
      : 'Editorial checklist ready for this draft. Nothing has been published.';
    updateEditorialCount();
  }
  function updateEditorialCount() {
    const count = editorialChecks().length;
    el('premium-editorial-count').textContent = count + ' of ' + editorialItems.length + ' review areas checked';
  }
  function renderReviewQueue() {
    const list = el('premium-review-queue-list');
    const status = el('premium-review-queue-status');
    if (!list || !status || lesson?.status !== 'editorial_review' || el('premium-editorial-review')?.hidden) return;
    list.replaceChildren();
    let previousTrack = '';
    let count = 0;
    const drafts = reviewCatalog.filter(item => item.status === 'editorial_review');
    for (const item of drafts) {
      if (item.track_slug !== previousTrack) {
        previousTrack = item.track_slug;
        const trackHeader = document.createElement('li');
        trackHeader.className = 'premium-review-track';
        trackHeader.textContent = previousTrack === 'wounded-boy' ? 'Track 1 · The Wounded Boy'
          : previousTrack === 'placeholder-wound' ? 'Track 2 · The Placeholder Wound'
          : previousTrack === 'safe-room-courtroom' ? 'Track 3 · When the Safe Room Becomes the Courtroom'
          : previousTrack === 'steadiness-command' ? 'Track 4 · Steadiness & Emotional Command'
          : previousTrack === 'life-rebuilt' ? 'Track 5 · Rebuilding a Life That Holds'
          : 'Track 6 · The Five Sacred Laws of Survival';
        list.append(trackHeader);
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = 'member-premium-lesson.html?lesson=' + encodeURIComponent(item.slug);
      a.textContent = String(item.lesson_number).padStart(2, '0') + ' · ' + String(item.title || 'Lesson');
      if (item.slug === slug) a.setAttribute('aria-current', 'page');
      const meta = document.createElement('small');
      const key = userId ? 'nbjb.plus.editorial-review.v1.' + userId + '.' + item.slug : null;
      let saved = null;
      try { saved = JSON.parse(storageRead(key) || 'null'); } catch (_) { /* malformed optional local record */ }
      if (saved && Array.isArray(saved.checks)) {
        const isCurrentRevision = item.slug !== slug || saved.revision === String(lesson?.updated_at || '');
        if (isCurrentRevision) {
          count++;
          const checked = editorialItems.filter(v => saved.checks.includes(v)).length;
          meta.textContent = item.slug === slug
            ? checked + ' of 5 areas noted · Not approved'
            : checked + ' of 5 areas noted · Verify revision on open';
        } else {
          meta.textContent = 'Draft changed · Review again';
        }
      } else meta.textContent = 'No review notes saved';
      li.append(a, meta);
      list.append(li);
    }
    status.textContent = count + ' of ' + drafts.length + ' drafts have local checklist notes. This is not a publication approval tally.';
  }

  function editorialSummary() {
    return [
      'Flamewalker+ editorial review — NOT publication approval',
      'Lesson: ' + String(lesson?.title || slug),
      'Draft revision: ' + String(lesson?.updated_at || 'unknown'),
      ...editorialItems.map(item => (el('premium-review-' + item).checked ? '[x] ' : '[ ] ') + item),
      'Editorial notes:',
      el('premium-editorial-notes').value.trim() || '(none)',
      'Publication status remains editorial_review until separately approved and published.'
    ].join('\n');
  }
  document.querySelectorAll('[data-premium-review-check]').forEach(checkbox =>
    checkbox.addEventListener('change', updateEditorialCount));
  el('premium-editorial-save')?.addEventListener('click', () => {
    if (!editorialKey || lesson?.status !== 'editorial_review') return;
    const draft = {
      revision: String(lesson.updated_at || ''),
      checks: editorialChecks(),
      notes: el('premium-editorial-notes').value.trim().slice(0, 4000),
      savedAt: new Date().toISOString()
    };
    const saved = storageWrite(editorialKey, JSON.stringify(draft));
    el('premium-editorial-status').textContent = saved
      ? 'Review notes saved on this device only. This does not approve or publish the lesson.'
      : 'Could not save your review notes in this browser. Use Copy Review Summary instead.';
    updateEditorialCount();
    renderReviewQueue();
  });
  el('premium-editorial-copy')?.addEventListener('click', async () => {
    if (lesson?.status !== 'editorial_review') return;
    try {
      await navigator.clipboard.writeText(editorialSummary());
      el('premium-editorial-status').textContent = 'Review summary copied. The draft is still unpublished.';
    } catch (_) {
      el('premium-editorial-status').textContent = 'Copy failed. Select and copy your review notes manually.';
    }
  });

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
    // Store long responses as complete local worksheets, never clipped notes.
    if(body.length > 2400) return saveCompleteWorksheetToWork(body, context, resultNode);
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
  function saveFinalReflectionJournal(entry, resultNode) {
    // Separate journal identity and accurate partial-answer count. Only the
    // user's explicit Save action invokes this device-local member service.
    const text = String(entry?.text || '').trim();
    const answered = Number(entry?.answered || 0);
    const total = Number(entry?.total || 0);
    if (!text || !answered) {
      resultNode.textContent = 'Answer at least one statement before saving.';
      return false;
    }
    if (text.length > 20000) {
      resultNode.textContent = 'This journal exceeds one local entry. Use Copy My Journal to keep all your answers.';
      return false;
    }
    const service = window.NBJBMemberService;
    if (!service?.recordToolEntry) {
      resultNode.textContent = 'My Work is unavailable on this device. Use Copy My Journal to keep your answers.';
      return false;
    }
    const saved = service.recordToolEntry('Lesson Journal', {
      title: (lesson?.title || 'Flamewalker+') + ' · Final Reflection',
      summary: 'Final reflection journal · ' + answered + ' of ' + total +
        ' statements answered. Open this entry to read your organized responses.',
      tags: ['Flamewalker+', 'Personal journal', 'Final reflection'],
      data: { lessonSlug: slug, section: current + 1, worksheet: text,
        journalEntries: Array.isArray(entry.answers) ? entry.answers.slice(0,20).map(item => ({
          prompt: String(item.prompt || '').slice(0,260),
          response: String(item.response || '').slice(0,800)
        })) : [] }
    });
    resultNode.textContent = saved.ok
      ? 'Saved ' + answered + ' answers as one journal entry in My Work on this device. You can open it below.'
      : 'Your device could not save this journal. Use Copy My Journal to keep the complete entry.';
    return Boolean(saved.ok);
  }
  function saveCompleteWorksheetToWork(text, context, resultNode) {
    // Complete worksheets are larger than ordinary 2,400-char notes. Store the
    // full document in the device-local entry data and a short card summary,
    // never silently truncate a member's answers.
    const body = String(text || '').trim();
    if (!body) { resultNode.textContent='Answer a question before saving.'; return; }
    if (body.length > 20000) {
      resultNode.textContent='The document is too long for one local entry. Copy the full worksheet instead.';
      return;
    }
    const service = window.NBJBMemberService;
    if (!service?.recordToolEntry) {
      resultNode.textContent='My Work is unavailable on this device. Use Copy to keep your worksheet.';
      return;
    }
    const saved = service.recordToolEntry('Lesson Worksheet', {
      title: (lesson?.title || 'Flamewalker+') + ' · ' + context,
      summary: 'Completed guided worksheet · Open the full document to review every question and answer.',
      tags: ['Flamewalker+', 'Guided worksheet'],
      data: { lessonSlug: slug, section: current + 1, worksheet: body }
    });
    resultNode.textContent = saved.ok
      ? 'The entire worksheet was saved as ONE document in My Work on this device. No answers were uploaded.'
      : 'The browser could not save the full worksheet. Copy it now to keep every answer.';
  }

  // This worksheet is optional, in-browser work. Reading and navigation never
  // write its contents. Copy and Save each require an explicit button press.
  function fatherMapHasAnswers() {
    return ['premium-map-received', 'premium-map-missed', 'premium-map-learned',
      'premium-map-chosen-rule', 'premium-map-decision']
      .some(id => Boolean(el(id).value.trim())) ||
      [...document.querySelectorAll('[data-map-category]')].some(node => node.checked);
  }
  function fatherMapText() {
    const response = id => el(id).value.trim() || '(not answered)';
    const categories = [...document.querySelectorAll('[data-map-category]')]
      .filter(node => node.checked).map(node => node.value);
    return [
      'The Father Wound — Father Imprint Map',
      'Column 1 · What I received:\n' + response('premium-map-received'),
      'Column 2 · What I missed:\n' + response('premium-map-missed'),
      'Column 3 · What I learned:\n' + response('premium-map-learned'),
      'Statement classification: ' + (categories.join(', ') || '(not selected)'),
      'Column 4 · What I choose now:',
      'Choice: ' + (el('premium-map-decision').value || '(not selected)'),
      'My chosen rule or next step:\n' + response('premium-map-chosen-rule')
    ].join('\n\n');
  }
  el('premium-map-copy')?.addEventListener('click', async () => {
    const status = el('premium-map-status');
    if (!fatherMapHasAnswers()) {
      status.textContent = 'Write in at least one box before copying your map.';
      return;
    }
    try {
      await navigator.clipboard.writeText(fatherMapText());
      status.textContent = 'Your complete map was copied. Paste it somewhere you control to keep it.';
    } catch (_) {
      status.textContent = 'Copy was blocked. You can select and copy the answers from each box manually.';
    }
  });
  el('premium-map-save')?.addEventListener('click', () => {
    const status = el('premium-map-status');
    if (!fatherMapHasAnswers()) {
      status.textContent = 'Write in at least one box before saving your map.';
      return;
    }
    saveReflectionToWork(fatherMapText(), 'Father Imprint Map', status);
  });
  el('premium-map-clear')?.addEventListener('click', () => {
    for (const id of ['premium-map-received', 'premium-map-missed',
      'premium-map-learned', 'premium-map-chosen-rule']) el(id).value = '';
    el('premium-map-decision').value = '';
    for (const node of document.querySelectorAll('[data-map-category]')) node.checked = false;
    el('premium-map-status').textContent = 'The map boxes on this page are cleared. Previously copied or saved work was not deleted.';
  });

  function reflectionAnswers() {
    return Array.from(el('premium-exercise-fields').querySelectorAll('label')).map(label => {
      const response = label.querySelector('textarea')?.value.trim() || '';
      return { prompt: label.firstChild?.textContent?.trim() || 'Reflection', response };
    });
  }

  el('premium-exercise-form')?.addEventListener('input', () => inlineWorkspace?.refreshCompletion?.());

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
  speechControls.play?.addEventListener('click', () => playSpeech('all'));
  speechControls.section?.addEventListener('click', () => playSpeech('section'));
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
    if (reading) playSpeech(speechMode); // Restart current section at selected speed.
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
  // Switching tabs should not intentionally cancel ongoing speech. Mobile
  // browsers may still suspend device speech when backgrounded or locked.
  window.addEventListener('pagehide', () => { saveNote(); if (speech) stopSpeech(); });
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
    await entitlements?.ready;
    // The server — not a frontend tier label — authorizes lesson bodies.
    // It permits the nominated editorial reviewer to inspect unpublished
    // drafts without requiring that internal account to buy a subscription.
    // Ordinary free accounts continue to receive HTTP 403 and no lesson.
    noticeState('Checking access…', 'Your private lesson is being verified by the server.');
    try {
      const { data, error } = await auth.client.functions.invoke('read-flamewalker-lesson', { body: { slug } });
      if (error || !data?.lesson) {
        const denied = error?.context?.status === 403 || data?.error === 'paid_membership_required';
        noticeState(denied ? 'Flamewalker+ membership required' : 'Lesson not available yet',
          denied
            ? 'This lesson requires active Flamewalker+ access. Monthly and annual memberships are available now. Unpublished drafts remain restricted to editorial reviewers.'
            : 'This lesson is still in review, or access could not be confirmed. Please try again later.');
        return;
      }
      if (slug === fortressSlug && (data.lesson.slug !== slug ||
          data.lesson.content?.sourceEdition !== fortressEdition)) {
        noticeState('Lesson not available yet', 'The approved lesson edition could not be confirmed.');
        return;
      }
      renderLesson(data.lesson);
      installFortressCompanion(data.lesson, data.workbookAvailable === true);
      // Only request the editorial/published catalog once server access to
      // this protected lesson has been confirmed for the current account.
      await loadCatalog();
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
