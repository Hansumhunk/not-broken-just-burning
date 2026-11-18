// Pure policy used by the Stripe webhook. No network, IDs, or money movement.
// For a failed or not-yet-paid renewal, never move the confirmed paid-through
// boundary forward. Stripe's current period can advance before payment clears.
export function paymentBoundary(subscription, prior, bounds, now = Date.now()) {
  const same = prior?.provider === 'stripe' && prior.provider_subscription_ref === subscription.id;
  const priorStart = Date.parse(prior?.valid_from ?? '');
  const priorEnd = Date.parse(prior?.valid_until ?? '');
  const hadPeriod = same && prior.tier === 'paid_member' &&
    ['active','trialing','past_due'].includes(prior.status) &&
    Number.isFinite(priorStart) && Number.isFinite(priorEnd) && priorEnd > priorStart;
  const free = { tier:'free_member',status:'active',validFrom:new Date(now).toISOString(),validUntil:null };
  // Canceled, unpaid, incomplete and paused subscriptions cannot grant access.
  if (!['active','trialing','past_due'].includes(subscription.status)) return free;
  // No change to established trial behavior; checkout currently sells no trial.
  if (subscription.status === 'trialing') return {tier:'paid_member',status:'trialing',...bounds};
  const invoice = subscription.latest_invoice;
  const paid = invoice && typeof invoice === 'object' && invoice.livemode === true &&
    invoice.status === 'paid';
  if (subscription.status === 'active' && paid && !subscription.pause_collection) {
    return {tier:'paid_member',status:'active',...bounds};
  }
  if (hadPeriod && priorEnd > now) {
    return {tier:'paid_member',status:'past_due',validFrom:prior.valid_from,validUntil:prior.valid_until};
  }
  return free;
}

// Different subscription references on the same account require review;
// especially a delayed terminal event must not overwrite a replacement plan.
export function subscriptionConflict(subscription, prior, customerId) {
  if (!prior || prior.provider !== 'stripe') return false;
  if (prior.provider_customer_ref && prior.provider_customer_ref !== customerId) return true;
  const different = prior.provider_subscription_ref && prior.provider_subscription_ref !== subscription.id;
  if (!different) return false;
  if (!['active','trialing','past_due'].includes(subscription.status)) return true;
  return prior.tier === 'paid_member' && ['active','trialing','past_due'].includes(prior.status) &&
    Date.parse(prior.valid_until ?? '') > Date.now();
}
