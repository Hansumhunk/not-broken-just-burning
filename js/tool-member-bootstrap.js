(() => {
  // Public tools remain free. This only prepares the optional member archive.
  const root = document.querySelector('#forge-tool, #checkin-tool, #pattern-tool, #boundary-builder, #one-stone, #six-question-tool');
  const auth = window.NBJBAuth;
  if (!root) return;
  const notice = document.createElement('p');
  notice.className = 'member-history-setup-note';
  notice.setAttribute('role', 'status');
  notice.textContent = auth?.ready
    ? 'Preparing optional Save to My Work…'
    : 'Save to My Work is unavailable because account services did not load. The free tool still works; copy your notes before leaving.';
  root.appendChild(notice);
  if (!auth?.ready) return;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load ' + src));
      document.body.appendChild(script);
    });
  }

  auth.ready.then(async () => {
    await loadScript('js/member-service.js');
    await loadScript('js/tool-member-history.js?v=20261103-save2');
    notice.remove();
  }).catch((error) => {
    console.error('public_tool_member_save_unavailable', error?.message || 'Account service failure');
    notice.textContent = 'Save to My Work could not initialize. The free reflection tool still works; copy your notes before leaving.';
  });
})();
