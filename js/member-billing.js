(() => {
  'use strict';

  // Public launch: enabled by founder-authorized release. The live Supabase
  // checkout service independently validates subscription, content and customer.
  const PUBLIC_CHECKOUT_UI_ENABLED = true;
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
  const paidOverview = document.querySelector('[data-membership-paid-overview]');
  const upgradeSections = [...document.querySelectorAll('[data-membership-upgrade]')];
  function showMembershipView(current) {
    const verified = current?.source === 'server';
    const activePaid = verified && current?.tier === 'paid';
    if (paidOverview) paidOverview.hidden = !activePaid;
    for (const section of upgradeSections) section.hidden = !verified || activePaid;
    return activePaid;
  }
  function paidThroughText(current) {
    const parsed = current?.validUntil ? new Date(current.validUntil) : null;
    const date = parsed && Number.isFinite(parsed.getTime()) ?
      parsed.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' }) : null;
    return current?.cancelAtPeriodEnd
      ? (date
          ? 'Your membership is scheduled to end on ' + date + '. Review subscription details or invoices in Stripe.'
          : 'Your subscription is scheduled to end after the current paid period. Review billing details in Stripe.')
      : 'Your Flamewalker+ membership is active. Manage your subscription and invoices in Stripe.';
  }


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
      if (response.error || response.data?.error) {
        // Supabase FunctionsHttpError wraps the server's JSON error body.
        // Identify the sandbox-only rejection without exposing Stripe IDs,
        // tokens, customer details, or raw exception messages to the member.
        let code = response.data?.error || '';
        const errorResponse = response.error?.context;
        if (!code && errorResponse?.clone && typeof errorResponse.json === 'function') {
          try {
            const details = await errorResponse.clone().json();
            code = typeof details?.error === 'string' ? details.error : '';
          } catch (_) {
            // A malformed/unavailable response remains a generic safe failure.
          }
        }
        if (code === 'sandbox_test_account_not_eligible') {
          throw new Error('sandbox_test_account_not_eligible');
        }
        throw new Error('billing_unavailable');
      }
      const target = stripeRedirectUrl(response.data?.url, purpose);
      if (!target) throw new Error('billing_unavailable');
      window.location.assign(target);
    } catch (error) {
      message(error?.message === 'sandbox_test_account_not_eligible'
        ? 'This account is reserved for billing tests and cannot open the live Stripe portal. Your subscription was not changed. Contact NBJB support to verify the correct live-billing account.'
        : 'We could not open Stripe. No charge was made on this page. Please retry or contact NBJB support.', true);
      setBusy(false);
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      // Never let an invisible or inapplicable purchase control invoke checkout.
      if (region.hidden || purchase.hidden) return;
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
      // Request intent is not payment success or an entitlement grant.
      try { window.NBJBTrackCheckoutIntent?.(offer); } catch (_) { /* optional analytics */ }
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
    if (paidOverview) paidOverview.hidden = true;
    for (const section of upgradeSections) section.hidden = true;
    if (!auth?.user?.id || !entitlements?.refresh) return;

    const current = await entitlements.refresh();
    if (current?.source !== 'server') return;
    const activePaid = showMembershipView(current);
    if (activePaid) {
      region.hidden = false;
      elHeading('Manage your Flamewalker+ billing');
      message(current.hasStripeBilling ? paidThroughText(current) :
        'Your Flamewalker+ access is active. Contact NBJB support for subscription billing assistance.');
      management.hidden = !current.hasStripeBilling;
      return;
    }
    if (current?.hasStripeBilling) {
      // Billing history alone is not proof of current paid access.
      region.hidden = false;
      management.hidden = false;
    }
    // When free after a prior subscription, offer renewal alongside access
    // to old invoices. No paid lesson entitlement is granted by this UI.
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
    if (paidOverview) paidOverview.hidden = true;
    for (const section of upgradeSections) section.hidden = true;
  });
})();
