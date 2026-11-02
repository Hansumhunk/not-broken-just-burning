(() => {
  "use strict";
  const auth = window.NBJBAuth;
  const byId = (id) => document.getElementById(id);
  const accountNode = byId("qa-account");
  const membershipNode = byId("qa-membership");
  const statusNode = byId("qa-status");
  const monthly = byId("qa-monthly");
  const annual = byId("qa-annual");
  const portal = byId("qa-portal");
  const refresh = byId("qa-refresh");
  let busy = false;
  let loggedIn = false;
  let hasStripeProfile = false;

  function status(message, error = false) {
    statusNode.textContent = message;
    statusNode.dataset.error = error ? "true" : "false";
  }
  function actions() {
    monthly.disabled = !loggedIn || busy;
    annual.disabled = !loggedIn || busy;
    portal.disabled = !loggedIn || !hasStripeProfile || busy;
    refresh.disabled = busy;
  }
  async function invoke(name, body) {
    const { data, error } = await auth.client.functions.invoke(name, body === undefined ? {} : { body });
    if (error) {
      let code = error.message || "The test request failed.";
      try {
        const response = error.context;
        const details = response && typeof response.json === "function" ? await response.json() : null;
        if (details?.error) code = details.error;
      } catch (_) { /* Show a harmless generic error. */ }
      throw new Error(code);
    }
    if (!data?.url || !data.url.startsWith("https://")) throw new Error("No valid Stripe test destination was returned.");
    return data.url;
  }
  async function loadMembership() {
    if (!auth?.user?.id) return;
    const { data, error } = await auth.client.from("membership_entitlements")
      .select("tier,status,valid_until,cancel_at_period_end,provider,provider_customer_ref")
      .eq("user_id",auth.user.id).maybeSingle();
    if (error) {
      membershipNode.textContent = "Membership lookup unavailable; do not assume paid access. " + error.message;
      hasStripeProfile = false;
      actions();
      return;
    }
    hasStripeProfile = data?.provider === "stripe" && Boolean(data?.provider_customer_ref);
    const expiry = data?.valid_until ? " · Valid until " + new Date(data.valid_until).toLocaleString() : "";
    const cancel = data?.cancel_at_period_end ? " · Renewal canceled" : "";
    membershipNode.textContent = data
      ? "Backend record: " + data.tier + " · " + data.status + expiry + cancel + (hasStripeProfile ? " · Stripe customer linked" : "")
      : "No member record found. Check free account registration.";
    actions();
  }
  async function checkout(offer) {
    if (!loggedIn || busy) return;
    busy = true; actions();
    status("Requesting an authorized Stripe SANDBOX Checkout session…");
    try {
      const url = await invoke("create-checkout-session", { offer });
      if (!url.includes("stripe.com/")) throw new Error("Unexpected checkout host; navigation blocked.");
      location.assign(url);
    } catch (error) {
      const code = error?.message || "Unknown failure.";
      status(code === "sandbox_not_authorized"
        ? "This account is not the approved sandbox QA user. Confirm NBJB_SANDBOX_TEST_USER_ID in Supabase matches the account you signed into."
        : "Checkout did not start: " + code, true);
      busy = false; actions();
    }
  }
  async function openPortal() {
    if (!loggedIn || busy) return;
    busy = true; actions(); status("Opening the Stripe SANDBOX Customer Portal…");
    try {
      const url = await invoke("create-customer-portal-session");
      if (!url.includes("stripe.com/")) throw new Error("Unexpected portal host; navigation blocked.");
      location.assign(url);
    } catch (error) {
      status("Customer Portal could not open: " + (error?.message || "Unknown failure."), true);
      busy = false; actions();
    }
  }
  monthly.addEventListener("click", () => checkout("flamewalker_plus_monthly"));
  annual.addEventListener("click", () => checkout("flamewalker_plus_annual"));
  portal.addEventListener("click", openPortal);
  refresh.addEventListener("click", async () => {
    await auth?.refresh?.();
    await loadMembership();
    status("Membership status refreshed from Supabase.");
  });
  async function boot() {
    if (!auth?.ready || !auth?.client) {
      status("Supabase account connection is unavailable. Checkout stays disabled.", true);
      return;
    }
    const { user } = await auth.ready;
    if (!user) {
      accountNode.textContent = "Not signed in. Sign in to your Flamewalker Test Account first.";
      membershipNode.textContent = "No subscription data is accessible until sign-in.";
      status("Sign in with your test account. No checkout can start without authentication.", true);
      return;
    }
    loggedIn = true;
    accountNode.textContent = "Signed in as " + (user.email || "Flamewalker member") + ".";
    actions();
    const checkoutResult = new URLSearchParams(location.search).get("checkout");
    if (checkoutResult === "success") status("Stripe test Checkout returned successfully. Refresh status to confirm the signed webhook granted your entitlement.");
    else if (checkoutResult === "cancelled") status("Stripe test Checkout was canceled; no payment was completed.");
    else status("Signed in. Choose Monthly to test a sandbox Checkout. Only your nominated QA account will be accepted.");
    await loadMembership();
  }
  boot().catch((error) => { status("Account setup failed: " + (error?.message || "unknown error"),true); });
})();