(() => {
  "use strict";
  const auth = window.NBJBAuth;
  const button = document.getElementById("preflight-run");
  const result = document.getElementById("preflight-result");
  const userNode = document.getElementById("preflight-user");
  const show = (message, error = false) => {
    result.textContent = message;
    result.dataset.error = error ? "true" : "false";
  };
  async function boot() {
    if (!auth?.ready || !auth?.client) { show("Account connection is unavailable.", true); return; }
    const { user } = await auth.ready;
    if (!user) {
      userNode.textContent = "Not signed in. Sign in to the nominated Flamewalker Test Account.";
      show("You must sign in before checking live prices.", true);
      return;
    }
    userNode.textContent = "Signed in as " + (user.email || "member") + ".";
    button.disabled = false;
    show("Ready to check live prices. This does not create a payment.");
  }
  button?.addEventListener("click", async () => {
    button.disabled = true;
    show("Checking the live Stripe account and both recurring prices…");
    try {
      const { data, error } = await auth.client.functions.invoke("check-live-stripe-prices", { body: {} });
      if (error) {
        let code = "Verification request failed.";
        try { const details = await error.context?.json?.(); code = details?.error || code; } catch (_) {}
        throw new Error(code);
      }
      const monthly = data?.checks?.find(x => x.plan === "monthly")?.valid;
      const annual = data?.checks?.find(x => x.plan === "annual")?.valid;
      if (data?.ready_for_canary && data?.restricted_key_authenticated && monthly && annual) {
        show("PASS — Live restricted key authenticated. Monthly $14.99 USD: valid. Annual $149.00 USD: valid. Public checkout remains disabled; no charge was made.");
      } else {
        show("CHECK NEEDED — Live key authentication: " + (data?.restricted_key_authenticated ? "passed" : "not verified") + ". Monthly price: " + (monthly ? "valid" : "invalid") + ". Annual price: " + (annual ? "valid" : "invalid") + ". No payment was created.", true);
      }
    } catch (err) {
      show("CHECK FAILED — " + (err?.message || "unknown error") + ". No payment was created.", true);
    } finally { button.disabled = false; }
  });
  boot().catch(() => show("Sign-in could not be verified.", true));
})();