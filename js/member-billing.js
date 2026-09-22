(() => {
  const auth = window.NBJBAuth;
  const entitlements = window.NBJBEntitlements;
  const statusNode = document.querySelector('[data-billing-status]');
  const upgradeButtons = [...document.querySelectorAll('[data-billing-offer]')];
  const portalButton = document.querySelector('[data-billing-portal]');

  function setStatus(message, bad = false) {
    if (!statusNode) return;
    statusNode.textContent = message || '';
    statusNode.dataset.state = bad ? 'error' : 'ok';
  }

  function setBusy(busy) {
    upgradeButtons.forEach((button) => { button.disabled = busy; });
    if (portalButton) portalButton.disabled = busy;
  }

  async function invoke(name, body) {
    if (!auth?.client) throw new Error('Account connection is unavailable.');
    const { data, error } = await auth.client.functions.invoke(name, body === undefined ? {} : { body });
    if (error) throw error;
    if (!data?.url) throw new Error('Billing session did not return a destination.');
    location.assign(data.url);
  }

  function render() {
    const current = entitlements?.load?.() || { tier: 'free' };
    const paid = entitlements?.hasTier?.('paid', current) || false;

    upgradeButtons.forEach((button) => {
      button.hidden = paid;
      button.disabled = paid;
    });

    if (portalButton) {
      portalButton.hidden = !paid;
      portalButton.disabled = !paid;
    }

    document.querySelectorAll('[data-billing-current-tier]').forEach((node) => {
      node.textContent = entitlements?.tierLabel?.(current.tier) || 'Flamewalker';
    });

    if (paid && current.cancelAtPeriodEnd && current.validUntil) {
      const until = new Date(current.validUntil).toLocaleDateString([], { dateStyle: 'medium' });
      setStatus(`Cancellation is scheduled. Flamewalker+ remains active through ${until}.`);
    }
  }

  upgradeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const offer = button.dataset.billingOffer;
      if (!offer) return;
      setBusy(true);
      setStatus('Opening secure Stripe checkout…');
      try {
        await invoke('create-checkout-session', { offer });
      } catch (error) {
        console.error('checkout_session_failed', error);
        setStatus(error?.message || 'Checkout could not be opened.', true);
        setBusy(false);
      }
    });
  });

  portalButton?.addEventListener('click', async () => {
    setBusy(true);
    setStatus('Opening Stripe billing portal…');
    try {
      await invoke('create-customer-portal-session');
    } catch (error) {
      console.error('portal_session_failed', error);
      setStatus(error?.message || 'Billing portal could not be opened.', true);
      setBusy(false);
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.get('checkout') === 'success') {
    setStatus('Payment completed. Confirming Flamewalker+ access…');
    entitlements?.refresh?.().then(() => {
      render();
      const current = entitlements?.load?.();
      if (current?.tier === 'paid') setStatus('Flamewalker+ is active.');
      else setStatus('Payment was received. Access is still being confirmed by the signed webhook.');
    });
  } else if (params.get('checkout') === 'cancelled') {
    setStatus('Checkout was cancelled. Your membership was not changed.');
  }

  render();
})();
