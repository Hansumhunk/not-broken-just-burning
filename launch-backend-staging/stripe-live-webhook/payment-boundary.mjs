// Pure policy used by the Stripe webhook. No network, IDs, or money movement.
// For a failed or not-yet-paid renewal, never move the confirmed paid-through
// boundary forward. Stripe's current period can advance before payment clears.
export function paymentBoundary(subscription, prior, bounds, now = Date.now(), live = true) {
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
  const item = subscription.items?.data?.[0];
  const through = Date.parse(bounds.validUntil ?? '');
  const paid = invoice && typeof invoice === 'object' && invoice.livemode === live &&
    invoice.status === 'paid' && Number.isFinite(through) &&
    (invoice.lines?.data ?? []).some(line => {
      const lineItem = line.parent?.subscription_item_details?.subscription_item ?? line.subscription_item;
      return item?.id && lineItem === item.id && Number.isFinite(line.period?.end) &&
        line.period.end * 1000 >= through;
    });
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

// Report refund/cancellation mismatches without taking a financial action.
// Only a confirmed succeeded full subscription refund with a verified invoice
// mapping is eligible. A refund alone does NOT cancel a Stripe agreement.
export function refundReview({scope, status, refundedAmount, chargeAmount, mappingVerified, subscriptionStatus, scheduledCancellation, entitlementPaid}) {
  if (status !== 'succeeded') return 'pending_or_failed';
  if (scope !== 'subscription' || !mappingVerified) return 'manual_mapping_review';
  if (!Number.isFinite(refundedAmount) || !Number.isFinite(chargeAmount) || chargeAmount <= 0 || refundedAmount < 0 || refundedAmount > chargeAmount) return 'manual_amount_review';
  if (refundedAmount < chargeAmount) return 'partial_refund_review';
  if (['canceled','incomplete_expired'].includes(subscriptionStatus)) return entitlementPaid ? 'entitlement_mismatch' : 'resolved';
  return scheduledCancellation ? 'full_refund_scheduled_exit_review' : 'full_refund_renewal_still_active';
}
