/* Optional, per-question journal editor for a protected Final Reflection page.
   Prompts come exclusively from authorized server lesson blocks. This module
   never reads network data and never writes to storage on input/navigation. */
(() => {
  'use strict';

  function parse(step) {
    if (!step || step.exercise || !/\bfinal reflection\b/i.test(step.title || '')) return null;
    const blocks = Array.isArray(step.blocks) ? step.blocks : [];
    const introIndex = blocks.findIndex(block =>
      block?.kind !== 'heading' && /^finish these\s*:/i.test(String(block?.text || '').trim()));
    if (introIndex < 0) return null;
    const listIndex = blocks.findIndex((block, index) =>
      index > introIndex && index <= introIndex + 2 &&
      block?.kind !== 'heading' && typeof block?.text === 'string' &&
      block.text.trim().split(/\n+/).filter(Boolean).length >= 3);
    if (listIndex < 0) return null;
    const prompts = blocks[listIndex].text.split(/\n+/).map(text => text.trim()).filter(Boolean);
    if (prompts.length < 3 || prompts.length > 20 ||
        prompts.some(text => text.length < 8 || text.length > 260)) return null;
    return {introIndex, listIndex, prompts};
  }

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function create({parking, lessonTitle, saveJournal}) {
    if (!parking || typeof saveJournal !== 'function') return null;
    let sheet = null;
    let active = null;
    let fields = [];
    let count = null;
    let status = null;
    let myWorkLink = null;

    function answers() {
      return fields.map(({prompt,input}, index) => ({
        index: index + 1,
        prompt,
        response: String(input.value || '').trim()
      }));
    }
    function filled() { return answers().filter(item => item.response); }
    function updateCount() {
      if (count) count.textContent = filled().length + ' of ' + fields.length +
        ' statements answered · Skip any that do not fit today.';
    }
    function documentText() {
      const chosen = filled();
      if (!chosen.length) return '';
      return [
        'FINAL REFLECTION JOURNAL',
        String(lessonTitle || 'Flamewalker+ guided lesson').toUpperCase(),
        '',
        chosen.length + ' of ' + fields.length + ' reflection statements answered.',
        'My reflections, saved by my choice.',
        '',
        ...chosen.flatMap(item => [
          String(item.index) + '. ' + item.prompt,
          item.response,
          ''
        ]),
        '—',
        'Personal reflection. I can revisit or revise these choices as I learn.'
      ].join('\n');
    }
    function setup(prompts) {
      sheet = make('section','premium-journal-sheet');
      sheet.setAttribute('aria-label','Final Reflection journal questions');
      const title = make('h3','premium-journal-heading','My Final Reflection Journal');
      const note = make('p','premium-journal-intro',
        'Write beside any sentence that speaks to you. Your answers stay in this page while it is open. Nothing is uploaded or saved until you choose Save.');
      count = make('p','premium-journal-count');
      count.setAttribute('aria-live','polite');
      const rows = make('div','premium-journal-rows');
      fields = prompts.map((prompt,index) => {
        const row = make('div','premium-journal-row');
        const label = make('label','premium-journal-prompt');
        const id = 'premium-journal-answer-' + (index + 1);
        label.htmlFor = id;
        label.textContent = String(index + 1).padStart(2,'0') + ' · ' + prompt;
        const input = make('textarea','premium-journal-answer');
        input.id = id;
        input.rows = 2;
        input.maxLength = 800;
        input.autocomplete = 'off';
        input.placeholder = 'My answer…';
        input.setAttribute('aria-label', prompt);
        input.addEventListener('input', () => {
          updateCount();
          if (status) status.textContent = 'Unsaved changes on this page. Choose Save to My Work when you are ready.';
          if (myWorkLink) myWorkLink.hidden = true;
        });
        row.append(label,input);
        rows.append(row);
        return {prompt,input};
      });
      const actions = make('div','premium-pause-actions premium-journal-actions');
      const copy = make('button','button button-ghost','Copy My Journal');
      copy.type = 'button';
      const save = make('button','button button-primary','Save Journal to My Work');
      save.type = 'button';
      actions.append(copy,save);
      status = make('p','premium-map-status premium-journal-status');
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
      myWorkLink = make('a','text-link premium-journal-work-link','Open My Work →');
      myWorkLink.href = 'member-work.html';
      myWorkLink.hidden = true;
      copy.addEventListener('click', async () => {
        const text = documentText();
        if (!text) { status.textContent = 'Answer at least one statement before copying.'; return; }
        try {
          await navigator.clipboard.writeText(text);
          status.textContent = 'Your formatted journal was copied. Paste it somewhere private to keep it.';
        } catch (_) {
          status.textContent = 'Copy is unavailable. Your answers remain in these boxes; use Save to My Work or copy them manually.';
        }
      });
      save.addEventListener('click', () => {
        const text = documentText();
        if (!text) { status.textContent = 'Answer at least one statement before saving.'; return; }
        const ok = saveJournal({
          text, answered: filled().length, total: fields.length, answers: filled()
        }, status);
        myWorkLink.hidden = ok !== true;
      });
      sheet.append(title,note,count,rows,actions,status,myWorkLink);
      updateCount();
    }

    function matches(step) { return Boolean(parse(step)); }
    function park() { if (sheet) parking.append(sheet); }
    function render(step, body, appendText) {
      const parsed = parse(step);
      if (!parsed) return false;
      if (!sheet || !active || active.prompts.join('\n') !== parsed.prompts.join('\n')) {
        setup(parsed.prompts);
      }
      active = parsed;
      for (let i = 0; i < step.blocks.length; i++) {
        const block = step.blocks[i];
        if (i === parsed.listIndex) body.append(sheet);
        else appendText(body, block.kind === 'heading' ? 'h3' : 'p', block.text);
      }
      return true;
    }
    return {matches,render,park,answers,documentText};
  }

  window.NBJBFinalReflectionJournal = Object.freeze({create,parse});
})();