(() => {
  const service = window.NBJBMemberService;
  if (!service) return;

  const form = document.querySelector('#start-here-form');
  const facts = document.querySelector('#start-here-facts');
  const feelings = document.querySelector('#start-here-feelings');
  const control = document.querySelector('#start-here-control');
  const status = document.querySelector('#start-here-status');
  const clear = document.querySelector('#start-here-clear');

  function setStatus(message, bad = false) {
    if (!status) return;
    status.textContent = message || '';
    status.dataset.state = bad ? 'error' : 'ok';
  }

  function text(node) {
    return (node?.value || '').trim();
  }

  function clearFields() {
    if (facts) facts.value = '';
    if (feelings) feelings.value = '';
    if (control) control.value = '';
    setStatus('Fields cleared. Nothing was deleted from previously saved My Work.');
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();

    const factText = text(facts);
    const feelingText = text(feelings);
    const controlText = text(control);

    if (!factText && !feelingText && !controlText) {
      setStatus('Write something in at least one field, or skip the exercise entirely. Both are allowed.', true);
      return;
    }

    const result = service.recordToolEntry('Start Here', {
      title: 'Start Here · Facts, Feelings, Control',
      summary: controlText
        ? `Next controllable action: ${controlText}`
        : 'Start Here reflection saved intentionally on this device.',
      tags: ['Start Here', 'Orientation'],
      data: {
        facts: factText,
        feelings: feelingText,
        control: controlText
      }
    });

    if (!result.ok) {
      setStatus('This browser could not save the reflection. Nothing was uploaded.', true);
      return;
    }

    if (controlText) {
      service.update({ journey: { nextAction: controlText } });
    }

    setStatus('Saved to My Work on this device. Your account did not upload the reflection body.');
  });

  clear?.addEventListener('click', clearFields);

  // One deliberate selection, one saved member Path focus, then a direct
  // continuation to the selected Path card. No account-wide data is uploaded.
  const pathIds = Object.freeze({
    'Fire Reclamation': 'path-focus-fire-reclamation',
    "The Guardian's Path": 'path-focus-guardian',
    'Sacred Mirror Work': 'path-focus-sacred-mirror',
    'Masculine Restoration': 'path-focus-masculine-restoration',
    'Voice of Fire': 'path-focus-voice-of-fire',
    'Circle of the Flame': 'path-focus-circle-of-flame'
  });
  const focusOptions = [...document.querySelectorAll('input[name="start-here-focus"]')];
  const focusStatus = document.querySelector('#start-here-focus-status');
  const focusButton = document.querySelector('#start-here-choose-focus');
  const savedFocus = service.load()?.journey?.focus || '';
  const prior = focusOptions.find((option) => option.value === savedFocus);
  if (prior) prior.checked = true;
  focusOptions.forEach((option) => option.addEventListener('change', () => {
    if (focusStatus) {
      focusStatus.textContent = option.value + ' selected. Choose My Current Focus to continue.';
      focusStatus.dataset.state = 'ok';
    }
  }));
  focusButton?.addEventListener('click', () => {
    const choice = focusOptions.find((option) => option.checked);
    if (!choice || !pathIds[choice.value]) {
      if (focusStatus) {
        focusStatus.textContent = 'Choose one of the six Path stages above first.';
        focusStatus.dataset.state = 'error';
      }
      focusOptions[0]?.focus();
      return;
    }
    const result = service.setFocus(choice.value);
    if (!result.ok) {
      if (focusStatus) {
        focusStatus.textContent = 'This device could not save your Path focus. Check browser storage and try again.';
        focusStatus.dataset.state = 'error';
      }
      return;
    }
    window.location.assign('member-path.html#' + pathIds[choice.value]);
  });

  // The next lesson is determined from the verified membership entitlement.
  // A free member gets a substantive free lesson, never a broken paywall jump.
  const nextLesson = document.querySelector('#start-here-next-lesson');
  const entitlement = window.NBJBEntitlements?.load?.();
  if (nextLesson && entitlement?.tier === 'paid' && entitlement?.source === 'server') {
    nextLesson.href = 'member-premium-lesson.html?lesson=father-wound';
    nextLesson.textContent = 'Continue to the Next Guided Lesson: The Father Wound →';
  }

})();
