(() => {
  'use strict';
  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const querySlug = new URLSearchParams(location.search).get('lesson') || 'father-wound';
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(querySlug) && querySlug.length <= 100 ? querySlug : 'father-wound';
  const userId = auth?.user?.id || '';
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
    p.textContent = text;
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
      if (kind === 'heading' && major.test(text)) {
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
      (block.kind === 'heading' && namedCaseHeading(block.text)) ||
      (block.kind === 'paragraph' && inlineScenario(block.text)));
    if (marker) {
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
    return entries.length ? {instruction:entries.join('\n\n'),kind:hasQuestionCue?'questions':'assignment'} : null;
  }
  function applySectionReflection(step) {
    const cue=sectionReflectionCue(step);
    const panel=el('premium-pause-reflection');
    const heading=el('premium-pause-heading');
    const hint=el('premium-pause-hint');
    const prompt=el('premium-pause-label');
    const response=el('premium-pause-note');
    if(!panel || !heading || !hint || !prompt || !response) return;
    heading.textContent=cue ? 'Complete this section’s reflection' : 'Private reading note';
    hint.textContent=cue ? 'Follow the lesson’s actual questions · your choice to save' :
      'Optional · use this space for your own notes';
    prompt.textContent=cue ? cue.instruction :
      'Write a private note about “'+step.title+'”, or leave this section blank.';
    response.rows=cue ? 9 : 4;
    response.placeholder=cue ? 'Write your answers here. Nothing is uploaded automatically.' :
      'Your optional note. Nothing is uploaded automatically.';
    panel.open=Boolean(cue);
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
    const onFatherMap = slug === 'father-wound' && /father imprint map/i.test(step.title) && !final;
    const onPositiveInheritance = slug === 'father-wound' && /^part 8\b/i.test(step.title) && !final;
    const isFatherPractice = onFatherMap || onPositiveInheritance;
    const isStructuredPractice = Boolean(inlineWorkspace?.matches(step));
    el('premium-father-map-guide').hidden = !onFatherMap;
    el('premium-father-positive-guide').hidden = !onPositiveInheritance;
    el('premium-father-map').hidden = true;
    el('premium-pause-reflection').hidden = isFatherPractice || isStructuredPractice || final;
    el('premium-current-step').hidden = final;
    el('premium-exercise').hidden = !final;
    const worksheetReview = el('premium-worksheet-review');
    if (worksheetReview) worksheetReview.hidden = true;
    if (final) {
      buildExercise();
      el('premium-exercise-form').hidden = Boolean(inlineWorkspace?.replacesGuidedReflection);
      inlineWorkspace?.renderCompletion?.(worksheetReview);
    } else {
      el('premium-step-kicker').textContent = 'Part ' + (current + 1) + ' · ' + estimate(step);
      el('premium-step-title').textContent = label(step);
      const body = el('premium-reader-body');
      body.classList.toggle('premium-map-layout', isFatherPractice || isStructuredPractice);
      body.replaceChildren();
      // For map lessons, place each real input immediately after the explanation
      // of its column, not at the very bottom or on a separate reflection page.
      if (isFatherPractice) renderFatherMapInline(step, body, onPositiveInheritance);
      else if (isStructuredPractice) inlineWorkspace.render(step, body, appendText);
      else step.blocks.forEach(b => appendText(body, b.kind === 'heading' ? 'h3' : 'p', b.text,
        b.kind === 'paragraph' && /^(?:and|or):?$/i.test(b.text.trim()) ? 'premium-prose-connector' : ''));
      el('premium-pause-note').value = notes.get(current) || '';
      el('premium-pause-status').textContent = '';
      if(!isFatherPractice && !isStructuredPractice) applySectionReflection(step);
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
      renderLesson(data.lesson);
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
