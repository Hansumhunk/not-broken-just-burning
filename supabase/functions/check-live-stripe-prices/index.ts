import { withSupabase } from "npm:@supabase/server@1.7.0";
import Stripe from "npm:stripe@22.6.2";

// Read-only live Stripe verification, available only to the named internal QA account.
// Does not create Checkout sessions, subscriptions, customers, invoices or charges.
const key = Deno.env.get("STRIPE_LIVE_SECRET_KEY");
const stripe = key ? new Stripe(key) : null;

const offers = [
  { lookup: "flamewalker_plus_monthly", amount: 1499, interval: "month" },
  { lookup: "flamewalker_plus_annual", amount: 14900, interval: "year" },
] as const;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const reviewer = Deno.env.get("NBJB_SANDBOX_TEST_USER_ID");
    const userId = ctx.userClaims?.id;
    if (!reviewer || !userId || userId !== reviewer) return json({ error: "qa_not_authorized" }, 403);
    if (!stripe || !(key?.startsWith("rk_live_") || key?.startsWith("sk_live_"))) {
      return json({ error: "live_key_not_configured" }, 503);
    }

    try {
      const response = await stripe.prices.list({
        lookup_keys: offers.map((offer) => offer.lookup),
        active: true,
        limit: 10,
      });
      const checks = offers.map((offer) => ({
        plan: offer.interval === "month" ? "monthly" : "annual",
        valid: response.data.some((price) =>
          price.lookup_key === offer.lookup &&
          price.livemode === true &&
          price.active === true &&
          price.currency === "usd" &&
          price.unit_amount === offer.amount &&
          price.recurring?.interval === offer.interval
        ),
      }));
      return json({
        environment: "live",
        restricted_key_authenticated: true,
        checks,
        ready_for_canary: checks.every((check) => check.valid),
        public_checkout_enabled_by_this_test: false,
      });
    } catch (error) {
      // No secret key, provider error text, or customer data is returned.
      const status = error instanceof Stripe.errors.StripeError ? error.statusCode : undefined;
      console.error("stripe_live_read_only_check_failed", status ?? "unknown");
      return json({ error: "live_stripe_read_only_check_failed", stripe_http_status: status ?? null }, 502);
    }
  }),
};
