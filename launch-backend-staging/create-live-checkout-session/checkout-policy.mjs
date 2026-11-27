// Pure checkout decisions; tests use fake data, never real Stripe requests.
export const OFFERS = Object.freeze({
  flamewalker_plus_monthly: {lookupKey:'flamewalker_plus_monthly',amount:1499,interval:'month'},
  flamewalker_plus_annual: {lookupKey:'flamewalker_plus_annual',amount:14900,interval:'year'}
});
export function lookupOffer(slug) {
  return typeof slug === 'string' && Object.hasOwn(OFFERS, slug) ? OFFERS[slug] : null;
}
export function validPrice(price, offer, live = true) {
  return Boolean(offer && price && price.lookup_key === offer.lookupKey &&
    price.currency === 'usd' && price.type === 'recurring' && price.unit_amount === offer.amount &&
    price.recurring?.interval === offer.interval && price.recurring?.interval_count === 1 && price.livemode === live);
}
export function checkoutConflict(subscriptions, sessions) {
  if (subscriptions?.has_more || sessions?.has_more || !Array.isArray(subscriptions?.data) || !Array.isArray(sessions?.data)) return 'subscription_check_incomplete';
  if (subscriptions.data.some(s => ['active','trialing','past_due','unpaid','incomplete','paused'].includes(s.status))) return 'already_subscribed';
  if (sessions.data.some(s => s.mode === 'subscription' && s.status === 'open')) return 'checkout_already_open';
  return null;
}
export function sessionIdempotencyKey(customerId, now = Date.now()) {
  // Same customer and time bucket share a key even for different offers.
  // Conflicting request parameters safely fail rather than create two sessions.
  // Listing open sessions also covers requests across a bucket boundary.
  return 'nbjb-membership-checkout-' + customerId + '-' + Math.floor(now / 1800000);
}
