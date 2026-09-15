const sacredFields = Array.from(document.querySelectorAll('[data-sacred]'));
const sacredPreview = document.querySelector('#sacred-preview');
const sacredStatus = document.querySelector('#sacred-status');

const sacredLabels = {
  who: 'WHO',
  what: 'WHAT',
  when: 'WHEN',
  where: 'WHERE',
  why: 'WHY',
  how: 'HOW'
};

function sacredValue(name) {
  return document.querySelector(`[data-sacred="${name}"]`)?.value.trim() || '';
}

function buildSacredNotes() {
  const hasContent = sacredFields.some((field) => field.value.trim());
  if (!hasContent) return '';

  const sections = [
    'NOT BROKEN JUST BURNING — SIX SACRED QUESTIONS', ''
  ];

  ['who', 'what', 'when', 'where', 'why', 'how'].forEach((name) => {
    sections.push(`${sacredLabels[name]}?\n${sacredValue(name) || '(blank)'}`, '');
  });

  sections.push(
    'REMINDER',
    'These notes organize one viewpoint. They do not by themselves prove motive, establish legal facts, diagnose another person, or replace professional investigation or care.'
  );

  return sections.join('\n');
}

function setSacredStatus(message) {
  if (!sacredStatus) return;
  sacredStatus.textContent = message;
  window.setTimeout(() => {
    if (sacredStatus.textContent === message) sacredStatus.textContent = '';
  }, 3000);
}

async function copySacredText(text) {
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

document.querySelector('#build-sacred')?.addEventListener('click', () => {
  const notes = buildSacredNotes();
  if (!notes) {
    setSacredStatus('Write something in at least one question first.');
    sacredFields[0]?.focus();
    return;
  }

  if (sacredPreview) sacredPreview.textContent = notes;
  setSacredStatus('Six-question notes built.');
});

document.querySelector('#copy-sacred')?.addEventListener('click', async () => {
  const notes = buildSacredNotes();
  if (!notes) {
    setSacredStatus('Write something in the worksheet first.');
    sacredFields[0]?.focus();
    return;
  }

  const copied = await copySacredText(notes);
  setSacredStatus(copied ? 'Six-question notes copied.' : 'Copy failed.');
});

document.querySelector('#clear-sacred')?.addEventListener('click', () => {
  sacredFields.forEach((field) => { field.value = ''; });
  if (sacredPreview) sacredPreview.textContent = 'Fill in any of the six questions, then build your notes.';
  setSacredStatus('Six-question worksheet cleared.');
  sacredFields[0]?.focus();
});