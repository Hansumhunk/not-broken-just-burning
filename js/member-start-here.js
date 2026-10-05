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
})();
