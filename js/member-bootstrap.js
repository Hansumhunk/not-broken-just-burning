(() => {
  const auth = window.NBJBAuth;
  if (!auth?.ready) return;

  const pageScripts = {
    dashboard: ["js/member-dashboard.js"],
    progress: ["js/member-history-insights.js"],
    work: ["js/member-history-insights.js"],
    workshop: ["js/tool-member-history.js", "js/member-workshop.js"],
    "start-here": ["js/member-start-here.js"],
    "premium-lesson": ["js/member-premium-lesson.js"]
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function start() {
    const initial = await auth.ready;
    let user = initial?.user || auth.user || null;
    // A restored Supabase session can resolve after the initial auth callback.
    // Re-read the persisted session before redirecting an existing member to login.
    if (!user && typeof auth.refresh === 'function') {
      try {
        const refreshed = await auth.refresh();
        user = refreshed?.user || auth.user || null;
      } catch (error) {
        console.warn('member_session_restore_failed');
      }
    }
    if (!user) {
      const next = encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash);
      location.replace(`member-auth.html?next=${next}`);
      return;
    }

    await loadScript("js/member-service.js");
    await loadScript("js/member-entitlements.js");

    if (window.NBJBEntitlements?.ready) {
      try {
        await window.NBJBEntitlements.ready;
      } catch (_) {
        // Never elevate access if the entitlement read fails.
      }
    }

    // Keep lesson navigation discoverable throughout the signed-in Hub.
    await loadScript("js/learning-continuity.js");
    await loadScript("js/member-platform.js");
    window.NBJBLearningContinuity?.render?.();

    const page = document.body.dataset.memberPage || "";
    for (const src of pageScripts[page] || []) {
      await loadScript(src);
    }
  }

  start().catch((error) => {
    console.error("member_bootstrap_failed", error);
    document.body.dataset.memberBootstrap = "failed";
  });
})();