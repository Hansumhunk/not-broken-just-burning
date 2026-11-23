// WB-001 one-time purchase rules. Pure and testable; does NOT unlock checkout.
// Existing Stripe LIVE / QA account separation and hard locks remain authoritative.
export const WB001_SLUG = "from-chaos-to-clarity";
export const WB001_RETAIL_CENTS = 1799;
export const WB001_MEMBER_CENTS = 999;
export const WB001_PUBLIC_RELEASE = false;
export const WB001_ASSET_KEY = "from-chaos-to-clarity/v1.0/NBJB-WB-001_v1.0_customer.zip";
export const WB001_DOWNLOAD_SECONDS = 60;
export const WB001_STATUSES = new Set(["pending","paid","expired","failed","refunded","disputed"]);

export function paidMemberEligible(row, now = Date.now()) {
  return !!(row && row.tier === "paid" && row.status === "active"
    && row.source === "stripe_subscription" && row.provider === "stripe"
    && typeof row.provider_subscription_ref === "string" && row.provider_subscription_ref.startsWith("sub_")
    && Number.isFinite(Date.parse(row.valid_from))
    && Date.parse(row.valid_from) <= now
    && Number.isFinite(Date.parse(row.valid_until)) && Date.parse(row.valid_until) > now);
}

export function determineOffer({ user, membership, guest } = {}) {
  if (guest) {
    if (user) throw Error("ambiguous_buyer");
    return Object.freeze({kind:"guest",tier:"retail",amount:WB001_RETAIL_CENTS});
  }
  if (!user?.id) throw Error("unverified_account");
  return paidMemberEligible(membership)
    ? Object.freeze({kind:"member",tier:"member",amount:WB001_MEMBER_CENTS})
    : Object.freeze({kind:"member",tier:"retail",amount:WB001_RETAIL_CENTS});
}

export function verifyConfiguredProduct(product, offer) {
  if(!product || product.slug !== WB001_SLUG || product.active !== true || product.currency !== "usd"
    || product.amount !== WB001_RETAIL_CENTS || product.asset_key !== WB001_ASSET_KEY
    || product.asset_version !== "v1.0" || product.download_name !== "NBJB-WB-001_v1.0_customer.zip"
    || !product.terms_version || !["exclusive","inclusive"].includes(product.tax_behavior)
    || !/^txcd_[0-9]+$/.test(product.tax_code || "") || !/^prod_/.test(product.stripe_product_id || ""))
    throw Error("product_not_approved");
  const id = offer.tier === "member" ? product.member_stripe_price_id : product.stripe_price_id;
  if (!/^price_/.test(id || "")) throw Error("price_not_approved");
  if (offer.tier === "member" && product.member_amount !== WB001_MEMBER_CENTS) throw Error("member_price_not_approved");
  return id;
}

export function verifyStripePrice(price, product, offer) {
  const id=verifyConfiguredProduct(product,offer);
  const stripeProduct=typeof price?.product === "string" ? price.product : price?.product?.id;
  if (!price || price.id !== id || price.livemode !== true || !price.active
    || price.type !== "one_time" || price.currency !== "usd" || price.unit_amount !== offer.amount
    || price.tax_behavior !== product.tax_behavior || stripeProduct !== product.stripe_product_id)
    throw Error("provider_price_mismatch");
  return true;
}

// All facts passed here must come from independently retrieved provider records after signature validation.
export function verifyPaidProvider({session,items,paymentIntent,charge,order}) {
  if (!order || !session || session.livemode !== true || session.mode !== "payment"
    || session.metadata?.nbjb_commerce !== "wb001-v1-live" || session.metadata?.order_id !== order.id
    || session.metadata?.slug !== WB001_SLUG || session.id !== order.stripe_session_id
    || session.client_reference_id !== order.id || session.currency !== "usd"
    || session.amount_subtotal !== order.amount || (session.total_details?.amount_discount||0)!==0
    || !items || items.has_more || items.data?.length !== 1
    || items.data[0].price?.id !== order.stripe_price_id && items.data[0].price !== order.stripe_price_id
    || items.data[0].quantity !== 1 || items.data[0].amount_subtotal !== order.amount)
    throw Error("session_mismatch");
  if (session.status === "expired" && session.payment_status === "unpaid") return "expired";
  if (session.payment_status !== "paid") return "pending";
  if (!paymentIntent || paymentIntent.livemode !== true || paymentIntent.status !== "succeeded"
    || paymentIntent.id !== (typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id)
    || paymentIntent.metadata?.order_id !== order.id || paymentIntent.metadata?.nbjb_commerce !== "wb001-v1-live"
    || paymentIntent.amount_received !== session.amount_total || paymentIntent.currency !== "usd"
    || !charge || charge.livemode !== true || charge.paid !== true || charge.payment_intent !== paymentIntent.id
    || charge.amount !== paymentIntent.amount_received || !Number.isSafeInteger(charge.amount_refunded)
    || charge.amount_refunded < 0 || charge.amount_refunded > charge.amount)
    throw Error("payment_mismatch");
  if (charge.disputed) return "disputed";
  if (charge.amount_refunded===charge.amount) return "refunded";
  return "paid";
}

export function nextOrderState(previous,observed) {
  if (!WB001_STATUSES.has(previous) || !WB001_STATUSES.has(observed)) throw Error("invalid_state");
  if (previous === "refunded" || previous === "disputed") return previous;
  if (previous === "paid" && !["refunded","disputed"].includes(observed)) return "paid";
  if (["failed","expired"].includes(previous) && ["paid","disputed","refunded"].includes(observed)) return "review";
  if (["failed","expired"].includes(previous)) return previous;
  return observed;
}

export function authorizeDirectDownload(order,{userId=null,claimNonce=null,now=Date.now()}={}) {
  if(!order || order.status !== "paid" || order.review_required || order.slug !== WB001_SLUG
    || order.asset_key !== WB001_ASSET_KEY || order.asset_version !== "v1.0" || order.refunded_amount>0)
    return false;
  if(order.buyer_kind === "member") return !!(userId && order.user_id === userId);
  if(order.buyer_kind === "guest") return !!(claimNonce && typeof claimNonce==="string"
    && order.claim_nonce === claimNonce && Number.isFinite(Date.parse(order.claim_expires_at))
    && Date.parse(order.claim_expires_at) > now && order.receipt_sent_at);
  return false;
}

export function validGuestEmail(email) {
  // Store only bounded syntax; Stripe Checkout still validates email and identity is proved by inbox possession.
  return typeof email === "string" && email.length <= 254
    && /^[^@\s]{1,64}@[^@\s]+\.[^@\s]+$/.test(email.trim());
}
