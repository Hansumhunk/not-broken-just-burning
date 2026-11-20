import { withSupabase } from "npm:@supabase/server@1.7.0";
import Stripe from "npm:stripe@22.6.2";
import { lookupOffer, validPrice } from "./checkout-policy.mjs";
import { reservedCheckout } from "./reserved-checkout.mjs";
import { bindMembershipCustomer } from "./customer-binding.mjs";

import { billingEnvironment } from "../membership-atomic/billing-environment.mjs";
const environment = billingEnvironment(k=>Deno.env.get(k));
const SITE_URL = environment?.site;
const stripe = environment ? new Stripe(environment.key) : null;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!stripe || !environment) return json({ error: "live_billing_not_configured" }, 503);

    const userId = ctx.userClaims?.id;
    const email = ctx.userClaims?.email;
    if (!userId) return json({ error: "unauthorized" }, 401);
    // Production checkout is closed unless a canary member is approved or a
    // deliberate public launch mode is explicitly enabled in Supabase Secrets.
    const launchMode = Deno.env.get("NBJB_LIVE_BILLING_MODE");
    const canaryUser = Deno.env.get("NBJB_LIVE_CANARY_USER_ID");
    const isCanary = launchMode === "canary" && canaryUser === userId;
    // Founder-authorized public release: the independent frontend and backend
    // flags are enabled in the reviewed release code, not by a browser request.
    // Canary mode remains available whenever public release is disabled again.
    const PUBLIC_LIVE_CHECKOUT_ENABLED = true;
    if (environment.live && (Deno.env.get("NBJB_LIVE_CHECKOUT_PAUSED") === "true" || (!PUBLIC_LIVE_CHECKOUT_ENABLED && !isCanary))) {
      return json({ error: "live_checkout_not_enabled" }, 503);
    }
    // The sandbox QA identity must not contaminate real customer billing.
    if (!environment.live && !environment.users.includes(userId)) return json({ error: "qa_identity_not_allowed" }, 403);
    if (environment.live && userId === Deno.env.get("NBJB_SANDBOX_TEST_USER_ID")) {
      return json({ error: "sandbox_test_account_not_eligible" }, 403);
    }

    let body: { offer?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const offerSlug = body?.offer;
    const offer = lookupOffer(offerSlug);
    if (!offer) return json({ error: "invalid_offer" }, 400);

    // Guard the merchant promise on the SERVER, not just with hidden client
    // buttons. A successful payment must have a real published library to open.
    // Editorial drafts are deliberately excluded from this count.
    const { count: publishedLessons, error: publicationError } = await ctx.supabaseAdmin
      .from("flamewalker_premium_lessons")
      .select("slug", { count: "exact", head: true })
      .eq("status", "published");
    if (publicationError || publishedLessons === null || publishedLessons < 7) {
      console.error("live_checkout_premium_library_not_ready");
      return json({ error: "premium_library_not_ready" }, 503);
    }

    const { data: entitlement, error: entitlementError } = await ctx.supabaseAdmin
      .from("membership_entitlements")
      .select("tier,status,provider,provider_customer_ref,provider_subscription_ref,cancel_at_period_end,valid_until")
      .eq("user_id", userId)
      .single();

    if (entitlementError || !entitlement) {
      console.error("checkout_entitlement_lookup_failed");
      return json({ error: "membership_unavailable" }, 500);
    }

    if (
      entitlement.tier === "paid_member" &&
      ["active", "trialing", "past_due"].includes(entitlement.status) &&
      Number.isFinite(Date.parse(entitlement.valid_until ?? "")) && Date.parse(entitlement.valid_until ?? "") > Date.now()
    ) {
      return json({ error: "already_subscribed", manage_in_portal: true }, 409);
    }

    try {
      if (!environment.live && (await stripe.accounts.retrieveCurrent()).id !== environment.account) return json({ error: "qa_stripe_account_mismatch" }, 503);
      const customerId = await bindMembershipCustomer(ctx.supabaseAdmin, stripe, {userId,email,entitlement,environment});

      const prices = await stripe.prices.list({
        active: true,
        lookup_keys: [offer.lookupKey],
        limit: 1,
      });

      const price = prices.data[0];
      if (!validPrice(price, offer, environment.live)) {
        console.error("checkout_offer_misconfigured", offer.lookupKey);
        return json({ error: "offer_not_configured" }, 503);
      }

      const request = {
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${SITE_URL}/member-store.html?checkout=success`,
        cancel_url: `${SITE_URL}/member-store.html?checkout=cancelled`,
        metadata: {
          nbjb_user_id: userId,
          nbjb_offer: offer.lookupKey,
          nbjb_environment: environment.tag,
        },
        subscription_data: {
          metadata: {
            nbjb_user_id: userId,
            nbjb_offer: offer.lookupKey,
            nbjb_environment: environment.tag,
          },
        },
      };
      const result = await reservedCheckout(ctx.supabaseAdmin, stripe, { userId, customerId, offerSlug, request });
      if (result.error) return json({ error: result.error, manage_in_portal: result.error === "already_subscribed" }, result.status);
      return json({ url: result.url });
    } catch (error) {
      console.error("checkout_failed");
      const code = error instanceof Error ? error.message : "";
      if (["customer_mapping_review","customer_mapping_unavailable"].includes(code)) return json({ error: code }, 503);
      return json({ error: "checkout_failed" }, 500);
    }
  }),
};
