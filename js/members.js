const MEMBER_KEY = 'nbjb.member.v1';

const memberName = document.querySelector('#member-name');
const memberFocus = document.querySelector('#member-focus');
const memberAction = document.querySelector('#member-action');
const memberValueBoxes = document.querySelectorAll('[data-member-value]');
const memberGreeting = document.querySelector('#member-greeting');
const focusPreview = document.querySelector('#member-focus-preview');
const valuesPreview = document.querySelector('#member-values-preview');
const actionPreview = document.querySelector('#member-action-preview');
const memberStatus = document.querySelector('#member-status');
const focusButtons = document.querySelectorAll('[data-set-focus]');
const focusCards = document.querySelectorAll('[data-focus-card]');

function selectedValues() {
  return Array.from(memberValueBoxes).filter((box) => box.checked).map((box) => box.value);
}

function memberSnapshot() {
  return {
    name: memberName?.value.trim() || '',
    focus: memberFocus?.value || '',
    action: memberAction?.value.trim() || '',
    values: selectedValues()
  };
}

function status(message) {
  if (!memberStatus) return;
  memberStatus.textContent = message;
  window.setTimeout(() => {
    if (memberStatus.textContent === message) memberStatus.textContent = '';
  }, 3000);
}

function paintFocusCards(focus) {
  focusCards.forEach((card) => {
    const isFocus = card.dataset.focusCard === focus;
    card.classList.toggle('is-focus', isFocus);
    const button = card.querySelector('[data-set-focus]');
    if (button) button.textContent = isFocus ? 'Current focus' : 'Set as my focus';
  });
}

function renderMember(snapshot) {
  if (!snapshot) return;
  if (memberGreeting) memberGreeting.textContent = snapshot.name ? `${snapshot.name}, this is what you are carrying right now.` : 'This is what you are carrying right now.';
  if (focusPreview) focusPreview.textContent = snapshot.focus || 'Not chosen yet';
  if (valuesPreview) valuesPreview.textContent = snapshot.values?.length ? snapshot.values.join(' · ') : 'Choose the values that need attention';
  if (actionPreview) actionPreview.textContent = snapshot.action || 'Choose one workable next step';
  paintFocusCards(snapshot.focus || '');
}

function populateMember(snapshot) {
  if (!snapshot) return;
  if (memberName) memberName.value = snapshot.name || '';
  if (memberFocus) memberFocus.value = snapshot.focus || '';
  if (memberAction) memberAction.value = snapshot.action || '';
  memberValueBoxes.forEach((box) => { box.checked = Boolean(snapshot.values?.includes(box.value)); });
  renderMember(snapshot);
}

function readStoredMember() {
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function storeMember(snapshot) {
  try {
    localStorage.setItem(MEMBER_KEY, JSON.stringify(snapshot));
    return true;
  } catch (error) {
    return false;
  }
}

const existing = readStoredMember();
if (existing) populateMember(existing);
else renderMember(memberSnapshot());

document.querySelector('#save-member')?.addEventListener('click', () => {
  const snapshot = memberSnapshot();
  const saved = storeMember(snapshot);
  renderMember(snapshot);
  status(saved ? 'Snapshot saved on this device.' : 'Your browser blocked local saving.');
});

document.querySelector('#clear-member')?.addEventListener('click', () => {
  try { localStorage.removeItem(MEMBER_KEY); } catch (error) {}
  if (memberName) memberName.value = '';
  if (memberFocus) memberFocus.value = '';
  if (memberAction) memberAction.value = '';
  memberValueBoxes.forEach((box) => { box.checked = false; });
  renderMember({ name: '', focus: '', action: '', values: [] });
  status('Member snapshot cleared from this device.');
  memberName?.focus();
});

focusButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const focus = button.dataset.setFocus || '';
    if (memberFocus) memberFocus.value = focus;
    const snapshot = memberSnapshot();
    const saved = storeMember(snapshot);
    renderMember(snapshot);
    status(saved ? `${focus} set as your current focus.` : 'Focus changed for this visit, but local saving was blocked.');
  });
});

memberFocus?.addEventListener('change', () => renderMember(memberSnapshot()));
memberName?.addEventListener('input', () => renderMember(memberSnapshot()));
memberAction?.addEventListener('input', () => renderMember(memberSnapshot()));
memberValueBoxes.forEach((box) => box.addEventListener('change', () => renderMember(memberSnapshot())));
