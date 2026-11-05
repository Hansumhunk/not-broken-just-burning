(() => {
  const auth = window.NBJBAuth;
  const body = document.body;

  // Every member HTML page hides <main> before this script runs.
  // Never render member data until the current browser session is confirmed.
  function hideMemberPage() {
    if (body?.dataset) delete body.dataset.memberAccess;
  }
  hideMemberPage();

  let redirecting = false;
  function loginDestination() {
    const next = encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash);
    return "member-auth.html?next=" + next;
  }
  function redirectToLogin() {
    hideMemberPage();
    if (redirecting) return;
    redirecting = true;
    location.replace(loginDestination());
  }

  function showError() {
    hideMemberPage();
    body.dataset.memberBootstrap = "failed";
    if (typeof document.querySelector !== "function") return;
    if (document.querySelector("#member-access-error")) return;
    const msg = document.createElement("p");
    msg.id = "member-access-error";
    msg.setAttribute("role", "alert");
    msg.textContent = "We could not verify your Flamewalker access. Your saved work has not been deleted. Reload this page or return to account access.";
    const link = document.createElement("a");
    link.href = "member-auth.html";
    link.textContent = " Account access";
    msg.appendChild(link);
    msg.style.cssText = "max-width:700px;margin:100px auto 30px;padding:20px;color:#fff;";
    document.body.insertBefore(msg, document.querySelector("main") || null);
  }

  if (!auth?.ready) {
    showError();
    return;
  }

  const pageScripts = {
    dashboard: ["js/member-dashboard.js"],
    progress: ["js/member-history-insights.js"],
    work: ["js/member-history-insights.js"],
    workshop: ["js/tool-member-history.js", "js/member-workshop.js"],
    "start-here": ["js/member-start-here.js"],
    "premium-lesson": ["js/member-chosen-code.js", "js/member-editorial-workbooks.js", "js/member-lesson-workspaces.js", "js/member-premium-lesson.js"],
    store: ["js/member-billing.js"]
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ['js/member-editorial-workbooks.js', 'js/member-chosen-code.js', 'js/member-premium-lesson.js', 'js/member-lesson-workspaces.js', 'js/member-history-insights.js', 'js/member-platform.js'].includes(src)
        ? src + '?v=split-alliance-v8'
        : src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load " + src));
      document.body.appendChild(script);
    });
  }

  async function verifiedUser() {
    const initial = await auth.ready;
    // Use the current persistent browser session, not an earlier auth callback.
    // If session verification fails, keep the page hidden rather than exposing data.
    if (typeof auth.refresh !== "function") throw new Error("Auth session verifier unavailable");
    const current = await auth.refresh();
    return current?.user?.id ? current.user : null;
  }

  async function start() {
    let user;
    try {
      user = await verifiedUser();
    } catch (error) {
      console.warn("member_session_verify_failed");
      showError();
      return;
    }
    if (!user) return redirectToLogin();

    if (typeof auth.onChange === "function") {
      auth.onChange(({ user: updated }) => {
        if (!updated?.id) return redirectToLogin();
        if (updated.id !== user.id) {
          hideMemberPage();
          location.reload();
        }
      });
    }

    // bfcache can restore a previously rendered page even after logout.
    // Hide it before it is cached, and reverify identity on return.
    window.addEventListener?.("pagehide", hideMemberPage);
    window.addEventListener?.("pageshow", (event) => {
      if (!event.persisted) return;
      hideMemberPage();
      verifiedUser().then((current) => {
        if (!current || current.id !== user.id) redirectToLogin();
        else location.reload(); // rerender scoped work from storage
      }).catch(showError);
    });

    await loadScript("js/member-service.js");
    await loadScript("js/member-entitlements.js");
    if (window.NBJBEntitlements?.ready) {
      try { await window.NBJBEntitlements.ready; }
      catch (_) { /* Never elevate entitlements after a failed read. */ }
    }
    await loadScript("js/learning-continuity.js");
    await loadScript("js/member-platform.js");
    window.NBJBLearningContinuity?.render?.();

    const page = body.dataset.memberPage || "";
    for (const src of pageScripts[page] || []) await loadScript(src);

    // A sign-out might have occurred while scripts were loading.
    if (!auth.user?.id || auth.user.id !== user.id) return redirectToLogin();
    body.dataset.memberAccess = "granted";
  }

  start().catch((error) => {
    console.error("member_bootstrap_failed", error);
    showError();
  });
})();
