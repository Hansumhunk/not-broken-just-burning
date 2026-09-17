(() => {
  const KEY = 'nbjb.member.entitlement.prototype.v1';
  const TIERS = Object.freeze({
    guest: 0,
    free: 1,
    paid: 2
  });

  const defaults = () => ({
    tier: 'free',
    products: [],
    events: [],
    updatedAt: null
  });

  function normalize(raw = {}) {
    const tier = Object.prototype.hasOwnProperty.call(TIERS, raw.tier) ? raw.tier : 'free';
    return {
      tier,
      products: Array.isArray(raw.products) ? [...new Set(raw.products.map(String))] : [],
      events: Array.isArray(raw.events) ? [...new Set(raw.events.map(String))] : [],
      updatedAt: Number(raw.updatedAt) || null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : defaults();
    } catch (error) {
      return defaults();
    }
  }

  function save(next) {
    const value = normalize({ ...next, updatedAt: Date.now() });
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
      return { ok: true, data: value };
    } catch (error) {
      return { ok: false, data: value, error };
    }
  }

  function setTier(tier) {
    const current = load();
    current.tier = Object.prototype.hasOwnProperty.call(TIERS, tier) ? tier : 'free';
    return save(current);
  }

  function hasTier(required = 'free', state = load()) {
    const currentRank = TIERS[state.tier] ?? TIERS.free;
    const requiredRank = TIERS[required] ?? TIERS.free;
    return currentRank >= requiredRank;
  }

  function hasProduct(slug, state = load()) {
    return Boolean(slug && state.products.includes(slug));
  }

  function hasEvent(slug, state = load()) {
    return Boolean(slug && state.events.includes(slug));
  }

  function canAccess({ tier = 'free', product = '', event = '' } = {}, state = load()) {
    if (product) return hasProduct(product, state);
    if (event) return hasEvent(event, state);
    return hasTier(tier, state);
  }

  function tierLabel(tier) {
    if (tier === 'paid') return 'Paid Flamewalker';
    if (tier === 'free') return 'Free Flamewalker';
    return 'Public / Guest';
  }

  function blockLockedLink(event) {
    if (event.currentTarget?.dataset?.accessState === 'locked') event.preventDefault();
  }

  function apply() {
    const state = load();

    document.querySelectorAll('[data-member-tier-label]').forEach((node) => {
      node.textContent = tierLabel(state.tier);
    });

    document.querySelectorAll('[data-requires-tier]').forEach((node) => {
      const required = node.dataset.requiresTier || 'free';
      const allowed = hasTier(required, state);
      node.dataset.accessState = allowed ? 'available' : 'locked';
      node.setAttribute('aria-disabled', allowed ? 'false' : 'true');

      if (node instanceof HTMLButtonElement) {
        const isPlaceholder = node.hasAttribute('data-placeholder');
        node.disabled = isPlaceholder || !allowed;
      }

      if (node instanceof HTMLAnchorElement) {
        node.addEventListener('click', blockLockedLink);
      }
    });

    const selector = document.querySelector('#prototype-access-tier');
    if (selector) {
      selector.value = state.tier === 'paid' ? 'paid' : 'free';
      selector.addEventListener('change', () => {
        setTier(selector.value);
        window.location.reload();
      });
    }

    document.querySelectorAll('[data-access-test-note]').forEach((node) => {
      node.textContent = 'Prototype only: this local tier switch is for interface testing. Real access will be enforced by authenticated backend authorization.';
    });
  }

  window.NBJBEntitlements = {
    KEY,
    TIERS,
    defaults,
    load,
    save,
    setTier,
    hasTier,
    hasProduct,
    hasEvent,
    canAccess,
    tierLabel,
    apply
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
