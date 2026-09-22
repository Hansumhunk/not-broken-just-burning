import { withSupabase } from "npm:@supabase/server@1.7.0";
import Stripe from "npm:stripe@22.6.2";

const SITE_URL = (Deno.env.get("NBJB_SITE_URL") ?? "https://notbrokenjustburning.com").replace(/\/+$/, "");
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!stripe) return json({ error: "billing_not_configured" }, 503);

    const userId = ctx.userClaims?.id;
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { data: entitlement, error } = await ctx.supabaseAdmin
      .from("membership_entitlements")
      .select("provider,provider_customer_ref")
      .eq("user_id", userId)
      .single();

    if (error || !entitlement) {
      console.error("portal_entitlement_lookup_failed", error?.message ?? "missing row");
      return json({ error: "membership_unavailable" }, 500);
    }

    if (entitlement.provider !== "stripe" || !entitlement.provider_customer_ref) {
      return json({ error: "no_billing_profile" }, 404);
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: entitlement.provider_customer_ref,
        return_url: `${SITE_URL}/join.html`,
      });

      return json({ url: session.url });
    } catch (portalError) {
      console.error("portal_failed", portalError instanceof Error ? portalError.message : "unknown");
      return json({ error: "portal_failed" }, 500);
    }
  }),
};
