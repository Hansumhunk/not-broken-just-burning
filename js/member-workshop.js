(() => {
  const service = window.NBJBMemberService;
  const auth = window.NBJBAuth;
  const main = document.querySelector('#main-content');
  if (!service || !auth?.user?.id || !main) return;

  const tools = {
    'checkin-tool': { name: 'Flame Check-In', summary: 'Notice what is happening, without making a verdict.' },
    'forge-tool': { name: 'The Forge', summary: 'Separate facts, interpretations, evidence, and next moves.' },
    'pattern-tool': { name: 'Pattern Map', summary: 'Observe repetition without assigning motive.' },
    'boundary-builder': { name: 'Boundary Builder', summary: 'Choose a boundary and an action you control.' },
    'one-stone': { name: 'One Stone', summary: 'Move one realistic step, not the entire mountain.' },
    'six-question-tool': { name: 'Six Sacred Questions', summary: 'Ask who, what, when, where, why, and how.' }
  };
  const buttons = Array.from(document.querySelectorAll('[data-open-workshop]'));
  const panels = Array.from(document.querySelectorAll('[data-workshop-panel]'));
  const context = document.querySelector('#workshop-context');

  function activate(key, { updateUrl = false, focus = false } = {}) {
    const chosen = Object.prototype.hasOwnProperty.call(tools, key) ? key : 'checkin-tool';
    panels.forEach((panel) => { panel.hidden = panel.dataset.workshopPanel !== chosen; });
    buttons.forEach((button) => {
      const selected = button.dataset.openWorkshop === chosen;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.classList.toggle('active', selected);
    });
    if (context) context.textContent = tools[chosen].summary;
    service.noteTool(tools[chosen].name);
    if (updateUrl && window.history?.replaceState) history.replaceState(null, '', '#' + chosen);
    if (focus) {
      const heading = document.querySelector('[data-workshop-panel="' + chosen + '"] h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
        heading.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  buttons.forEach((button) => button.addEventListener('click', () => {
    activate(button.dataset.openWorkshop, { updateUrl: true, focus: true });
  }));
  window.addEventListener('hashchange', () => activate(window.location.hash.slice(1)));

  main.hidden = false;
  document.querySelector('#workshop-loading')?.remove();
  activate(window.location.hash.slice(1));
})();
