(() => {
  "use strict";
  const auth = window.NBJBAuth;
  const id = name => document.getElementById(name);
  const accountNode = id("canary-account");
  const membershipNode = id("canary-membership");
  const statusNode = id("canary-status");
  const monthly = id("canary-monthly");
  const portal = id("canary-portal");
  const refresh = id("canary-refresh");
  const consent = id("canary-consent");
  let busy = false;
  let loggedIn = false;
  let paid = false;
  let linked = false;

  function status(message, error = false) {
    statusNode.textContent = message;
    statusNode.dataset.error = error ? "true" : "false";
  }
  function actions() {
    monthly.disabled = !loggedIn || !consent.checked || busy || paid;
    portal.disabled = !loggedIn || !linked || busy;
    refresh.disabled = busy;
  }
  async function invoke(name, body) {
    const { data, error } = await auth.client.functions.invoke(name, body === undefined ? {} : { body });
    if (error) {
      let code = error.message || "Request failed";
      try {
        const response = error.context;
        const details = response && typeof response.json === "function" ? await response.json() : null;
        if (details?.error) code = details.error;
      } catch (_) { /* Never show credentials or raw responses. */ }
      throw new Error(code);
    }
    if (!data?.url || !/^https:\/\/(checkout|billing)\.stripe\.com\//.test(data.url)) {
      throw new Error("Unexpected Stripe destination; navigation blocked.");
    }
    return data.url;
  }
  async function loadMembership() {
    if (!auth?.user?.id) return;
    const { data, error } = await auth.client.from("membership_entitlements")
      .select("tier,status,valid_until,cancel_at_period_end,provider,provider_customer_ref")
      .eq("user_id", auth.user.id).maybeSingle();
    if (error) {
      status("Membership lookup unavailable: " + error.message, true);
      linked = false; paid = false; actions();
      return;
    }
    paid = data?.tier === "paid_member" && ["active","trialing","past_due"].includes(data?.status);
    linked = data?.provider === "stripe" && Boolean(data?.provider_customer_ref);
    const expiry = data?.valid_until ? " · Paid through " + new Date(data.valid_until).toLocaleString() : "";
    const cancel = data?.cancel_at_period_end ? " · Renewal canceled" : "";
    membershipNode.textContent = data
      ? "Backend record: " + data.tier + " · " + data.status + expiry + cancel + (linked ? " · Billing profile linked" : "")
      : "No membership record found. Check free account registration.";
    actions();
  }
  consent.addEventListener("change", actions);
  monthly.addEventListener("click", async () => {
    if (!loggedIn || busy || paid || !consent.checked) return;
    busy = true; actions();
    status("Requesting a REAL Stripe monthly Checkout session…");
    try {
      const url = await invoke("create-live-checkout-session", { offer: "flamewalker_plus_monthly" });
      if (!url.startsWith("https://checkout.stripe.com/")) throw new Error("Unexpected checkout domain");
      location.assign(url);
    } catch (error) {
      const code = error?.message || "Unknown error";
      const display = code === "live_checkout_not_enabled"
        ? "Real checkout is not authorized for this account yet. Confirm the dedicated live canary account and Supabase canary secrets."
        : code === "sandbox_test_account_not_eligible"
          ? "The sandbox QA login cannot be used for live purchases. Sign in using the separate canary account."
          : "Checkout did not start: " + code;
      status(display, true);
      busy = false; actions();
    }
  });
  portal.addEventListener("click", async () => {
    if (!loggedIn || busy || !linked) return;
    busy = true; actions(); status("Opening the LIVE Stripe Billing Portal…");
    try {
      location.assign(await invoke("create-live-customer-portal-session"));
    } catch (error) {
      status("Live Billing Portal could not open: " + (error?.message || "Unknown error"), true);
      busy = false; actions();
    }
  });
  refresh.addEventListener("click", async () => {
    busy = true; actions();
    try {
      await auth?.refresh?.();
      await loadMembership();
      status("Membership status refreshed from Supabase. Verify the paid-through date and renewal status.");
    } finally { busy = false; actions(); }
  });
  async function boot() {
    if (!auth?.ready || !auth?.client) {
      status("Supabase sign-in is unavailable; no checkout can start.", true);
      return;
    }
    const { user } = await auth.ready;
    if (!user) {
      accountNode.textContent = "Not signed in. Sign in with the dedicated live canary account.";
      membershipNode.textContent = "No membership data before sign-in.";
      status("Sign in to the explicitly approved live canary account. No checkout can start without authentication.", true);
      return;
    }
    loggedIn = true;
    accountNode.textContent = "Signed in as " + (user.email || "member") + ".";
    await loadMembership();
    status("Signed in. This is a REAL subscription test; you must explicitly acknowledge the charge before proceeding.");
  }
  boot().catch(() => status("Account verification failed. Checkout remains disabled.", true));
})();
