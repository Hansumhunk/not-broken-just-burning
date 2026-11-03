(() => {
  // Public tools remain free. This only prepares the optional member archive.
  const root = document.querySelector('#forge-tool, #checkin-tool, #pattern-tool, #boundary-builder, #one-stone, #six-question-tool');
  const auth = window.NBJBAuth;
  if (!root || !auth?.ready) return;

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
    await loadScript('js/tool-member-history.js');
  }).catch((error) => {
    console.error('public_tool_member_save_unavailable', error);
    // Reflection remains available even if the optional account system is not.
  });
})();
