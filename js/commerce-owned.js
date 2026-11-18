/* Read-only presentation of the existing authorized entitlement state.
 * Never grants access or constructs download URLs. The future delivery endpoint
 * must independently check account identity and ownership. */
(() => {
  const status = document.getElementById('nbjb-owned-status');
  const list = document.getElementById('nbjb-owned-products');
  if (!status || !list || !window.NBJBCommerceCatalog) return;
  function reset(message) { list.replaceChildren(); status.textContent = message; }
  function render() {
    const state = window.NBJBEntitlements?.load();
    if (!window.NBJBAuth?.user || document.body.dataset.memberAccess !== 'granted') {
      reset('Sign in to view your separately owned products.'); return;
    }
    if (state?.source !== 'server' || !state.updatedAt) {
      reset('Your product access could not yet be verified. Reload or contact support if this continues.'); return;
    }
    const owned = window.NBJBCommerceCatalog.ownedProducts(state);
    reset(owned.length ? 'Verified product ownership. File delivery is not enabled in this preview; contact NBJB for access questions.' : 'No products from this collection are currently confirmed on your account. Sales are not open.');
    for (const product of owned) {
      const item = document.createElement('li');
      item.textContent = product.title + ' — Owned; delivery unavailable';
      list.appendChild(item);
    }
  }
  window.addEventListener('nbjb:entitlements', render);
  window.addEventListener('nbjb:auth', () => reset('Checking account access…'));
  window.addEventListener('pagehide', () => reset('Checking account access…'));
  window.addEventListener('pageshow', render);
  const access = new MutationObserver(render);
  access.observe(document.body, {attributes:true, attributeFilter:['data-member-access']});
  window.NBJBEntitlements?.ready?.then(render).catch(() => reset('Unable to verify product ownership.'));
  render();
})();