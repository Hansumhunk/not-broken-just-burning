(() => {
  const auth = window.NBJBAuth;
  if (!auth?.ready) return;

  const pageScripts = {
    dashboard: ["js/member-dashboard.js"],
    progress: ["js/member-history-insights.js"],
    work: ["js/member-history-insights.js"]
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
    const { user } = await auth.ready;
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
        // Free-member fallback is safer than granting paid access on a failed read.
      }
    }

    await loadScript("js/member-platform.js");

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
