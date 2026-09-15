(() => {
  const STORAGE_KEY = 'nbjb-forge-v1';

  const thought = document.querySelector('#forge-thought');
  const rewrite = document.querySelector('#forge-rewrite');
  const fields = Array.from(document.querySelectorAll('[data-forge]'));
  const analyzeButton = document.querySelector('#analyze-forge');
  const copyButton = document.querySelector('#copy-forge-v2');
  const clearButton = document.querySelector('#clear-forge-v2');
  const useDraftButton = document.querySelector('#use-forge-draft');
  const output = document.querySelector('#forge-analysis-output');
  const outputBody = document.querySelector('#forge-analysis-body');
  const status = document.querySelector('#forge-status');
  const saveStatus = document.querySelector('#forge-save-status');

  if (!thought || !rewrite || !analyzeButton || !output || !outputBody) return;

  const labels = {
    know: 'What I actually know',
    assume: 'What I am assuming',
    support: 'Evidence that supports the thought',
    challenge: 'Evidence that challenges the thought',
    pattern: 'The pattern I am seeing',
    compassion: 'What I would tell someone I love'
  };

  const absoluteTerms = ['always', 'never', 'everyone', 'everybody', 'no one', 'nobody', 'nothing', 'everything', 'completely', 'forever', 'impossible', 'definitely', 'obviously'];
  const predictionTerms = ['will', "won't", 'going to', 'probably', 'inevitably', 'certainly', 'bound to', 'cannot possibly'];
  const motiveTerms = ['wants to', 'trying to', 'intentionally', 'deliberately', 'planned to', 'because they', 'because he', 'because she', 'their goal', 'his goal', 'her goal'];
  const crisisTerms = ['kill myself', 'suicide', 'end my life', 'hurt myself', 'self harm', 'self-harm', 'kill him', 'kill her', 'kill them', 'hurt someone', 'hurt somebody'];

  const getValue = (name) => document.querySelector(`[data-forge="${name}"]`)?.value.trim() || '';
  const wordCount = (text) => (text.match(/\b[\w’'-]+\b/g) || []).length;
  const esc = (text) => String(text || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  function compact(text, limit = 220) {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= limit) return cleaned;
    return `${cleaned.slice(0, limit).replace(/\s+\S*$/, '')}…`;
  }

  function termsFound(text, terms) {
    const lower = text.toLowerCase();
    return terms.filter((term) => lower.includes(term));
  }

  function collect() {
    return {
      thought: thought.value.trim(),
      know: getValue('know'),
      assume: getValue('assume'),
      support: getValue('support'),
      challenge: getValue('challenge'),
      pattern: getValue('pattern'),
      compassion: getValue('compassion'),
      rewrite: rewrite.value.trim()
    };
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...collect(), savedAt: Date.now() }));
      if (saveStatus) saveStatus.textContent = 'Draft saved on this device.';
    } catch (error) {
      if (saveStatus) saveStatus.textContent = 'Could not save this draft on this device.';
    }
  }

  let saveTimer;
  function queueSave() {
    if (saveStatus) saveStatus.textContent = 'Saving locally…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 250);
  }

  function loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return;
      thought.value = saved.thought || '';
      rewrite.value = saved.rewrite || '';
      fields.forEach((field) => { field.value = saved[field.dataset.forge] || ''; });
      if (saveStatus) saveStatus.textContent = 'Saved Forge draft restored from this device.';
    } catch (error) {
      // Ignore malformed or blocked local storage.
    }
  }

  function flash(message) {
    if (!status) return;
    status.textContent = message;
    setTimeout(() => { if (status.textContent === message) status.textContent = ''; }, 3200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand('copy');
      helper.remove();
      return copied;
    }
  }

  function buildDraft(data) {
    const parts = [];
    if (data.know) parts.push(`What I can verify right now is ${compact(data.know, 240)}`);
    else parts.push('I do not yet have enough clearly stated facts to treat my first thought as a settled conclusion');

    if (data.support && data.challenge) {
      parts.push('There is evidence that supports my concern, and there is also evidence or missing context that complicates it');
    } else if (data.support) {
      parts.push('I have listed evidence that supports my concern, but I have not yet tested it against much counter-evidence or missing context');
    } else if (data.challenge) {
      parts.push('I have identified evidence or context that challenges the harshest version of the thought');
    }

    if (data.assume) parts.push(`I may also be assuming or predicting ${compact(data.assume, 220)}`);
    if (data.pattern) parts.push('I notice a possible pattern, but repetition alone does not prove motive, intent, or cause');
    if (data.compassion) parts.push(`Using the standard I would use for someone I care about, I would say: ${compact(data.compassion, 220)}`);

    parts.push('I can keep what is verified, label what is still uncertain, and choose my next action from what is actually within my control');
    return `${parts.join('. ')}.`.replace(/\.\./g, '.');
  }

  function analyze(data) {
    const combined = Object.values(data).join(' ');
    const absolutes = termsFound(data.thought, absoluteTerms);
    const predictions = termsFound(`${data.thought} ${data.assume}`, predictionTerms);
    const motives = termsFound(`${data.thought} ${data.assume} ${data.pattern}`, motiveTerms);
    const crisis = termsFound(combined, crisisTerms);

    const counts = {
      facts: wordCount(data.know),
      assumptions: wordCount(data.assume),
      support: wordCount(data.support),
      challenge: wordCount(data.challenge)
    };

    const grounding = [];
    if (!data.know) grounding.push('The verified-facts box is still empty. Before reaching a conclusion, name what a neutral observer could actually confirm.');
    else grounding.push('You separated at least some verifiable information from the original thought. Keep that layer distinct from interpretation.');

    if (counts.assumptions > Math.max(18, counts.facts * 1.5)) grounding.push('Your assumptions/predictions currently outweigh the facts you wrote down. That does not make them wrong; it means uncertainty is doing a lot of the work.');
    if (absolutes.length) grounding.push(`The original thought uses absolute language (${absolutes.slice(0, 4).join(', ')}). Test whether there are exceptions before treating the statement as total.`);
    if (predictions.length) grounding.push('Some language points toward the future. A prediction can guide preparation, but it is not the same thing as present evidence.');

    const evidence = [];
    if (data.support && data.challenge) evidence.push('You gave the thought both supporting and challenging evidence. That is a healthier evidence test than building only one side.');
    if (data.support && !data.challenge) evidence.push('You listed support but no meaningful challenge yet. Ask what evidence, exception, or missing context could weaken your first conclusion.');
    if (!data.support && data.challenge) evidence.push('The evidence you entered leans more toward challenging the original thought than supporting it. The first wording may be harsher than the current record supports.');
    if (!data.support && !data.challenge) evidence.push('The evidence test is still thin. Add what supports the thought and what challenges it before asking the Forge for certainty.');

    const pattern = [];
    if (data.pattern) pattern.push('You identified a possible pattern. Treat it as a reason to ask better questions, not as automatic proof of cause or motive.');
    else pattern.push('No repeating pattern is described yet. If repetition matters, name what repeats and what changes between examples.');
    if (motives.length) pattern.push('Some wording appears to assign motive or intent. Ask what part is directly observable and what part remains a hypothesis about why another person acted.');

    const compassion = [];
    if (data.compassion) compassion.push('You created a second standard by imagining what you would tell someone you care about. Compare its fairness, precision, and room for uncertainty with the language you use toward yourself.');
    else compassion.push('The compassion test is blank. Answering it can expose a double standard: harsh certainty for yourself, nuance for everyone else.');

    const sacred = [
      '<strong>Who:</strong> Who is directly involved, and who is only a source of interpretation?',
      '<strong>What:</strong> What happened that could be described without guessing motive?',
      '<strong>When:</strong> What is the order, frequency, and relevant exception?',
      '<strong>Where:</strong> What context or environment could change the meaning?',
      '<strong>Why:</strong> Which explanation is supported, and which explanation is still a hypothesis?',
      '<strong>How:</strong> What mechanism can you verify, and what can you actually do next?'
    ];

    return {
      counts,
      grounding,
      evidence,
      pattern,
      compassion,
      sacred,
      crisis,
      draft: buildDraft(data)
    };
  }

  function renderAnalysis(data, result) {
    const caution = result.crisis.length
      ? `<div class="forge-caution"><strong>Pause the analysis if this is about immediate safety.</strong><p>Your notes contain language that may involve self-harm or harm to someone else. The Forge is not crisis care. If there is immediate danger, use <a href="support.html">Support &amp; Safety</a> or real-world emergency/professional help rather than relying on this analysis.</p></div>`
      : '';

    const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;

    outputBody.innerHTML = `
      ${caution}
      <div class="forge-analysis-grid">
        <section class="forge-analysis-card">
          <h3>Evidence balance</h3>
          <p>This is a completeness check, not a truth score. More words do not make a claim more true.</p>
          <div class="forge-balance-meter">
            <div class="forge-meter-cell"><strong>${result.counts.facts}</strong><span>fact words</span></div>
            <div class="forge-meter-cell"><strong>${result.counts.assumptions}</strong><span>assumption words</span></div>
            <div class="forge-meter-cell"><strong>${result.counts.support}</strong><span>support words</span></div>
            <div class="forge-meter-cell"><strong>${result.counts.challenge}</strong><span>challenge words</span></div>
          </div>
        </section>
        <section class="forge-analysis-card"><h3>Fact vs. forecast</h3>${list(result.grounding)}</section>
        <section class="forge-analysis-card"><h3>Evidence test</h3>${list(result.evidence)}</section>
        <section class="forge-analysis-card"><h3>Pattern discipline</h3>${list(result.pattern)}</section>
        <section class="forge-analysis-card"><h3>The compassion gap</h3>${list(result.compassion)}</section>
        <section class="forge-analysis-card"><h3>Six Sacred Questions</h3>${list(result.sacred)}</section>
        <section class="forge-analysis-card full">
          <h3>Draft forged version</h3>
          <p>This is a starting draft based only on what you typed. Edit it until it feels accurate rather than comforting, punishing, or certain for certainty's sake.</p>
          <div class="forge-draft" id="forge-draft-result">${esc(result.draft)}</div>
          <div class="forge-analysis-actions">
            <button class="button button-primary" id="use-forge-draft-inline" type="button">Use This as My Forged Version</button>
          </div>
        </section>
      </div>`;

    output.hidden = false;
    output.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.querySelector('#use-forge-draft-inline')?.addEventListener('click', () => {
      rewrite.value = result.draft;
      saveDraft();
      flash('Draft moved into your forged version. Edit it until it is yours.');
      rewrite.focus();
    });
  }

  function buildNotes() {
    const data = collect();
    const result = analyze(data);
    const sections = [
      'NOT BROKEN JUST BURNING — THE FORGE', '',
      `THE THOUGHT\n${data.thought || '(blank)'}`, ''
    ];

    fields.forEach((field) => sections.push(`${labels[field.dataset.forge]}\n${field.value.trim() || '(blank)'}`, ''));
    sections.push(
      'SIX SACRED QUESTIONS', 'Who? What? When? Where? Why? How?', '',
      'FORGE ANALYSIS — ON-DEVICE STRUCTURED REVIEW',
      ...result.grounding.map((item) => `- ${item}`),
      ...result.evidence.map((item) => `- ${item}`),
      ...result.pattern.map((item) => `- ${item}`),
      ...result.compassion.map((item) => `- ${item}`), '',
      `DRAFT FORGED VERSION\n${result.draft}`, '',
      `MY FORGED VERSION\n${data.rewrite || '(blank)'}`, '',
      'Reflection tool only. This browser-based analysis is rule-based, not a diagnosis, legal conclusion, factual verification service, or substitute for professional or emergency support.'
    );
    return sections.join('\n');
  }

  analyzeButton.addEventListener('click', () => {
    const data = collect();
    if (!data.thought && !data.know && !data.assume && !data.support && !data.challenge && !data.pattern && !data.compassion) {
      flash('Add something to the Forge before analyzing it.');
      thought.focus();
      return;
    }
    saveDraft();
    renderAnalysis(data, analyze(data));
  });

  copyButton?.addEventListener('click', async () => {
    const copied = await copyText(buildNotes());
    flash(copied ? 'Forge notes and analysis copied.' : 'Copy failed.');
  });

  clearButton?.addEventListener('click', () => {
    thought.value = '';
    rewrite.value = '';
    fields.forEach((field) => { field.value = ''; });
    outputBody.innerHTML = '';
    output.hidden = true;
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
    if (saveStatus) saveStatus.textContent = 'Saved Forge draft removed from this device.';
    flash('Forge cleared from this device.');
    thought.focus();
  });

  useDraftButton?.addEventListener('click', () => {
    const data = collect();
    const result = analyze(data);
    rewrite.value = result.draft;
    saveDraft();
    rewrite.focus();
  });

  [thought, rewrite, ...fields].forEach((field) => field.addEventListener('input', queueSave));
  loadDraft();
})();
