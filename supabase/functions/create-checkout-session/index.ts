import { withSupabase } from "npm:@supabase/server@1.7.0";
import Stripe from "npm:stripe@22.6.2";

const SITE_URL = (Deno.env.get("NBJB_SITE_URL") ?? "https://notbrokenjustburning.com").replace(/\/+$/, "");
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const OFFERS = {
  flamewalker_plus_monthly: {
    lookupKey: "flamewalker_plus_monthly",
    amount: 1499,
    interval: "month",
  },
  flamewalker_plus_annual: {
    lookupKey: "flamewalker_plus_annual",
    amount: 14900,
    interval: "year",
  },
} as const;

type OfferSlug = keyof typeof OFFERS;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!stripe) return json({ error: "billing_not_configured" }, 503);

    const userId = ctx.userClaims?.id;
    const email = ctx.userClaims?.email;
    if (!userId) return json({ error: "unauthorized" }, 401);

    let body: { offer?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const offerSlug = body.offer as OfferSlug;
    const offer = OFFERS[offerSlug];
    if (!offer) return json({ error: "invalid_offer" }, 400);

    const { data: entitlement, error: entitlementError } = await ctx.supabaseAdmin
      .from("membership_entitlements")
      .select("tier,status,provider,provider_customer_ref,provider_subscription_ref,cancel_at_period_end")
      .eq("user_id", userId)
      .single();

    if (entitlementError || !entitlement) {
      console.error("checkout_entitlement_lookup_failed", entitlementError?.message ?? "missing row");
      return json({ error: "membership_unavailable" }, 500);
    }

    if (
      entitlement.tier === "paid_member" &&
      ["active", "trialing", "past_due"].includes(entitlement.status)
    ) {
      return json({ error: "already_subscribed", manage_in_portal: true }, 409);
    }

    try {
      let customerId =
        entitlement.provider === "stripe" && entitlement.provider_customer_ref
          ? entitlement.provider_customer_ref
          : null;

      if (!customerId) {
        const customer = await stripe.customers.create(
          {
            email: typeof email === "string" ? email : undefined,
            metadata: {
              nbjb_user_id: userId,
              nbjb_source: "flamewalker_account",
            },
          },
          { idempotencyKey: `nbjb-customer-${userId}` },
        );

        customerId = customer.id;

        const { error: customerSaveError } = await ctx.supabaseAdmin
          .from("membership_entitlements")
          .update({
            provider: "stripe",
            provider_customer_ref: customerId,
          })
          .eq("user_id", userId);

        if (customerSaveError) throw customerSaveError;
      }

      const prices = await stripe.prices.list({
        active: true,
        lookup_keys: [offer.lookupKey],
        limit: 1,
      });

      const price = prices.data[0];
      if (
        !price ||
        price.lookup_key !== offer.lookupKey ||
        price.currency !== "usd" ||
        price.type !== "recurring" ||
        price.unit_amount !== offer.amount ||
        price.recurring?.interval !== offer.interval
      ) {
        console.error("checkout_offer_misconfigured", offer.lookupKey);
        return json({ error: "offer_not_configured" }, 503);
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${SITE_URL}/join.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/join.html?checkout=cancelled`,
        metadata: {
          nbjb_user_id: userId,
          nbjb_offer: offerSlug,
        },
        subscription_data: {
          metadata: {
            nbjb_user_id: userId,
            nbjb_offer: offerSlug,
          },
        },
      });

      if (!session.url) return json({ error: "checkout_unavailable" }, 502);
      return json({ url: session.url });
    } catch (error) {
      console.error("checkout_failed", error instanceof Error ? error.message : "unknown");
      return json({ error: "checkout_failed" }, 500);
    }
  }),
};
