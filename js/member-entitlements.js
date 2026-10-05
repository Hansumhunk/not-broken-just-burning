(() => {
  const TIERS = Object.freeze({
    guest: 0,
    free: 1,
    paid: 2
  });

  let state = {
    tier: 'free',
    membershipStatus: 'active',
    cancelAtPeriodEnd: false,
    validUntil: null,
    products: [],
    events: [],
    updatedAt: null,
    source: 'server'
  };

  function normalizeMembership(row) {
    const paid = row?.tier === 'paid_member' && ['active', 'trialing', 'past_due'].includes(row?.status);
    return {
      tier: paid ? 'paid' : 'free',
      membershipStatus: row?.status || 'active',
      cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
      validUntil: row?.valid_until || null
    };
  }

  function load() {
    return {
      ...state,
      products: [...state.products],
      events: [...state.events]
    };
  }

  function hasTier(required = 'free', current = load()) {
    const currentRank = TIERS[current.tier] ?? TIERS.free;
    const requiredRank = TIERS[required] ?? TIERS.free;
    return currentRank >= requiredRank;
  }

  function hasProduct(slug, current = load()) {
    return Boolean(slug && current.products.includes(slug));
  }

  function hasEvent(slug, current = load()) {
    return Boolean(slug && current.events.includes(slug));
  }

  function canAccess({ tier = 'free', product = '', event = '' } = {}, current = load()) {
    if (product) return hasProduct(product, current);
    if (event) return hasEvent(event, current);
    return hasTier(tier, current);
  }

  function tierLabel(tier) {
    if (tier === 'paid') return 'Flamewalker+';
    if (tier === 'free') return 'Flamewalker';
    return 'Public / Guest';
  }

  function blockLockedLink(event) {
    if (event.currentTarget?.dataset?.accessState === 'locked') event.preventDefault();
  }

  function apply() {
    const current = load();

    document.querySelectorAll('[data-member-tier-label]').forEach((node) => {
      node.textContent = tierLabel(current.tier);
    });

    document.querySelectorAll('[data-requires-tier]').forEach((node) => {
      const required = node.dataset.requiresTier || 'free';
      const allowed = hasTier(required, current);
      node.dataset.accessState = allowed ? 'available' : 'locked';
      node.setAttribute('aria-disabled', allowed ? 'false' : 'true');

      if (node instanceof HTMLButtonElement) {
        const isPlaceholder = node.hasAttribute('data-placeholder');
        node.disabled = isPlaceholder || !allowed;
      }

      if (node instanceof HTMLAnchorElement && !node.dataset.entitlementGuarded) {
        node.dataset.entitlementGuarded = 'true';
        node.addEventListener('click', blockLockedLink);
      }
    });

    document.querySelectorAll('[data-access-test-note]').forEach((node) => {
      node.textContent = 'Access shown here is read from your authenticated NBJB entitlement record. Browser storage cannot promote an account to Flamewalker+.';
    });
  }

  async function loadRemote() {
    const auth = window.NBJBAuth;
    const client = auth?.client;
    const user = auth?.user;

    if (!client || !user?.id) {
      state = { ...state, tier: 'guest', updatedAt: Date.now() };
      apply();
      return load();
    }

    try {
      const [membershipResult, productsResult, eventsResult] = await Promise.all([
        client
          .from('membership_entitlements')
          .select('tier,status,valid_until,cancel_at_period_end')
          .eq('user_id', user.id)
          .single(),
        client
          .from('product_entitlements')
          .select('product_slug,status,valid_until')
          .eq('user_id', user.id)
          .eq('status', 'active'),
        client
          .from('event_entitlements')
          .select('event_slug,status,valid_until')
          .eq('user_id', user.id)
          .eq('status', 'active')
      ]);

      if (membershipResult.error) throw membershipResult.error;
      if (productsResult.error) throw productsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      const membership = normalizeMembership(membershipResult.data);
      const now = Date.now();
      const notExpired = (value) => !value || Date.parse(value) > now;

      state = {
        ...state,
        ...membership,
        products: (productsResult.data || [])
          .filter((row) => notExpired(row.valid_until))
          .map((row) => row.product_slug),
        events: (eventsResult.data || [])
          .filter((row) => notExpired(row.valid_until))
          .map((row) => row.event_slug),
        updatedAt: Date.now(),
        source: 'server'
      };
    } catch (error) {
      console.error('entitlement_read_failed', error);
      state = {
        ...state,
        tier: 'free',
        products: [],
        events: [],
        updatedAt: Date.now(),
        source: 'server_error'
      };
    }

    apply();
    window.dispatchEvent(new CustomEvent('nbjb:entitlements', { detail: load() }));
    return load();
  }

  const ready = loadRemote();

  window.NBJBEntitlements = {
    TIERS,
    ready,
    load,
    refresh: loadRemote,
    hasTier,
    hasProduct,
    hasEvent,
    canAccess,
    tierLabel,
    apply
  };
})();
