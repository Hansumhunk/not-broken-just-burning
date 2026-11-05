(() => {
  'use strict';

  // Release gate: flip only in the final approved launch PR, never during
  // ordinary website work. Live Supabase Checkout has an independent gate.
  const PUBLIC_CHECKOUT_UI_ENABLED = false;
  const MIN_PUBLISHED_LESSONS = 7;
  const region = document.getElementById('member-live-billing');
  if (!region) return;
  // Existing subscribers must retain access to billing management even while
  // new public checkout is closed. Never reveal the purchase panel by default.
  region.hidden = true;

  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const status = document.getElementById('member-billing-status');
  const purchase = document.getElementById('member-billing-purchase');
  const management = document.getElementById('member-billing-management');
  const available = document.getElementById('member-billing-available-lessons');
  const consent = document.getElementById('member-billing-consent');
  const buttons = [...document.querySelectorAll('[data-live-billing-offer]')];
  const manageButton = document.getElementById('member-billing-portal');
  const heading = document.getElementById('member-live-billing-title');
  function elHeading(value) { if (heading) heading.textContent = value; }

  function message(text, error = false) {
    status.textContent = text;
    status.dataset.state = error ? 'error' : 'ok';
  }
  function setBusy(busy) {
    for (const button of [...buttons, manageButton]) if (button) button.disabled = busy;
  }
  function stripeRedirectUrl(value, purpose) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      const expected = purpose === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com';
      return url.protocol === 'https:' && url.hostname === expected ? url.href : null;
    } catch (_) { return null; }
  }

  async function invokeAndRedirect(fn, body, purpose) {
    if (!auth?.user?.id || !auth?.client) {
      message('Your session has expired. Sign in again before continuing.', true);
      return;
    }
    setBusy(true);
    message('Opening secure Stripe billing…');
    try {
      const response = await auth.client.functions.invoke(fn, { body });
      if (response.error || response.data?.error) throw new Error('Billing is not available.');
      const target = stripeRedirectUrl(response.data?.url, purpose);
      if (!target) throw new Error('Could not confirm the secure Stripe redirect.');
      window.location.assign(target);
    } catch (_) {
      message('We could not open Stripe. No charge was made on this page. Please retry or contact NBJB support.', true);
      setBusy(false);
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      // Defense in depth: disabling new sales is independent of billing management.
      if (!PUBLIC_CHECKOUT_UI_ENABLED) {
        message('New Flamewalker+ subscriptions are not on sale yet.', true);
        return;
      }
      if (!consent?.checked) {
        message('Please review and acknowledge the subscription terms before proceeding.', true);
        consent?.focus();
        return;
      }
      const offer = button.dataset.liveBillingOffer;
      if (!['flamewalker_plus_monthly', 'flamewalker_plus_annual'].includes(offer)) {
        message('That membership option is unavailable.', true);
        return;
      }
      invokeAndRedirect('create-live-checkout-session', { offer }, 'checkout');
    });
  }
  manageButton?.addEventListener('click', () => {
    invokeAndRedirect('create-live-customer-portal-session', {}, 'portal');
  });

  async function start() {
    region.hidden = true;
    purchase.hidden = true;
    management.hidden = true;
    if (!auth?.user?.id || !entitlements?.refresh) return;

    const current = await entitlements.refresh();
    if (current?.hasStripeBilling) {
      // Billing management remains available for a customer with a Stripe
      // billing record even if the paid lesson entitlement has ended.
      region.hidden = false;
      management.hidden = false;
      elHeading('Manage your Flamewalker+ billing');
      message(current.cancelAtPeriodEnd
        ? 'Your subscription is scheduled to end after the current paid period. Review invoices or billing in Stripe.'
        : current.tier === 'paid'
          ? 'Your Flamewalker+ membership is active. Manage billing in Stripe.'
          : 'Review past payments and billing in Stripe. Paid lesson access is not currently active.');
      return;
    }
    // Free members cannot start a new subscription until the separate,
    // explicit launch approval enables both checkout gates.
    if (!PUBLIC_CHECKOUT_UI_ENABLED) return;
    region.hidden = false;
    elHeading('Choose your guided learning membership');
    message('Checking published lesson availability…');
    try {
      const response = await auth.client.functions.invoke('read-flamewalker-lesson', {
        body: { action: 'catalog' }
      });
      if (response.error || !Array.isArray(response.data?.lessons)) throw new Error('catalog_unavailable');
      const ready = response.data.lessons.filter(item => item?.status === 'published');
      if (ready.length < MIN_PUBLISHED_LESSONS) {
        message('Flamewalker+ is still in editorial preparation. Paid checkout remains closed.');
        return;
      }
      available.textContent = ready.length + ' published guided lessons currently included. Additional lessons may be released after editorial approval.';
      const params = new URLSearchParams(window.location.search);
      // A successful redirect does not prove webhook fulfillment. Prevent a
      // second purchase while payment/entitlement reconciliation is pending.
      if (params.get('checkout') === 'success') {
        message('Stripe returned you to NBJB. We are checking your paid access. Refresh the page to check your entitlement; do not purchase again.', false);
        return;
      }
      purchase.hidden = false;
      message(params.get('checkout') === 'cancelled'
        ? 'You left Checkout without completing a subscription. No access change is assumed.'
        : 'Choose a recurring membership below. The next screen is secure Stripe Checkout.');
    } catch (_) {
      message('The published lesson catalog cannot be verified. Checkout is unavailable for now.', true);
    }
  }
  start().catch(() => {
    // On an entitlement read failure, fail closed: neither purchases nor
    // unverified billing-management links should be exposed.
    region.hidden = true;
    purchase.hidden = true;
    management.hidden = true;
  });
})();
