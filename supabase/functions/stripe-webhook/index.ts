import { withSupabase } from "npm:@supabase/server@1.7.0";
import Stripe from "npm:stripe@22.6.2";

const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

function invoiceSubscriptionId(invoice: unknown): string | null {
  const value = invoice as {
    subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } } | null;
  };
  return idOf(value.subscription) ?? idOf(value.parent?.subscription_details?.subscription);
}

function periodBounds(subscription: Stripe.Subscription) {
  const items = subscription.items?.data ?? [];
  const starts = items
    .map((item) => (item as Stripe.SubscriptionItem & { current_period_start?: number }).current_period_start)
    .filter((value): value is number => Number.isFinite(value));
  const ends = items
    .map((item) => (item as Stripe.SubscriptionItem & { current_period_end?: number }).current_period_end)
    .filter((value): value is number => Number.isFinite(value));

  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const start = starts.length ? Math.min(...starts) : legacy.current_period_start;
  const end = ends.length ? Math.max(...ends) : legacy.current_period_end;

  return {
    validFrom: start ? new Date(start * 1000).toISOString() : new Date(subscription.created * 1000).toISOString(),
    validUntil: end ? new Date(end * 1000).toISOString() : null,
  };
}

function membershipState(status: Stripe.Subscription.Status) {
  if (status === "active") return { tier: "paid_member", status: "active" };
  if (status === "trialing") return { tier: "paid_member", status: "trialing" };
  if (status === "past_due") return { tier: "paid_member", status: "past_due" };
  return { tier: "free_member", status: "active" };
}

export default {
  fetch: withSupabase({ auth: "none", cors: "disabled" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!stripe || !webhookSecret) return json({ error: "billing_not_configured" }, 503);

    const signature = req.headers.get("stripe-signature");
    if (!signature) return json({ error: "missing_signature" }, 400);

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch {
      return json({ error: "invalid_signature" }, 400);
    }

    const { data: existing, error: existingError } = await ctx.supabaseAdmin
      .from("stripe_webhook_events")
      .select("status")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingError) {
      console.error("webhook_receipt_lookup_failed", existingError.message);
      return json({ error: "receipt_lookup_failed" }, 500);
    }

    if (existing && ["processed", "ignored", "processing"].includes(existing.status)) {
      return json({ received: true, duplicate: true });
    }

    if (existing?.status === "failed") {
      const { error: resetError } = await ctx.supabaseAdmin
        .from("stripe_webhook_events")
        .update({ status: "processing", error_message: null, processed_at: null, received_at: new Date().toISOString() })
        .eq("event_id", event.id);
      if (resetError) {
        console.error("webhook_receipt_reset_failed", resetError.message);
        return json({ error: "receipt_update_failed" }, 500);
      }
    } else {
      const object = event.data.object as { id?: string };
      const { error: insertError } = await ctx.supabaseAdmin
        .from("stripe_webhook_events")
        .insert({
          event_id: event.id,
          event_type: event.type,
          event_created_at: new Date(event.created * 1000).toISOString(),
          livemode: event.livemode,
          object_ref: typeof object?.id === "string" ? object.id : null,
          status: "processing",
        });

      if (insertError) {
        if (insertError.code === "23505") return json({ received: true, duplicate: true });
        console.error("webhook_receipt_insert_failed", insertError.message);
        return json({ error: "receipt_insert_failed" }, 500);
      }
    }

    let receiptUserId: string | null = null;
    let receiptObjectRef: string | null = null;

    const syncSubscription = async (subscriptionId: string, hintedUserId?: string | null) => {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customerId = idOf(subscription.customer);

      let userId =
        typeof subscription.metadata?.nbjb_user_id === "string" && UUID_RE.test(subscription.metadata.nbjb_user_id)
          ? subscription.metadata.nbjb_user_id
          : hintedUserId && UUID_RE.test(hintedUserId)
            ? hintedUserId
            : null;

      if (!userId && customerId) {
        const { data: mapped, error: mapError } = await ctx.supabaseAdmin
          .from("membership_entitlements")
          .select("user_id")
          .eq("provider", "stripe")
          .eq("provider_customer_ref", customerId)
          .maybeSingle();

        if (mapError) throw mapError;
        if (mapped?.user_id) userId = mapped.user_id;
      }

      if (!userId) return null;

      const mappedState = membershipState(subscription.status);
      const bounds = periodBounds(subscription);
      const paid = mappedState.tier === "paid_member";

      const { error: entitlementError } = await ctx.supabaseAdmin
        .from("membership_entitlements")
        .upsert(
          {
            user_id: userId,
            tier: mappedState.tier,
            status: mappedState.status,
            source: "stripe_subscription",
            provider: "stripe",
            provider_customer_ref: customerId,
            provider_subscription_ref: subscription.id,
            valid_from: paid ? bounds.validFrom : new Date().toISOString(),
            valid_until: paid ? bounds.validUntil : null,
            cancel_at_period_end: paid ? Boolean(subscription.cancel_at_period_end) : false,
          },
          { onConflict: "user_id" },
        );

      if (entitlementError) throw entitlementError;

      receiptUserId = userId;
      receiptObjectRef = subscription.id;
      return userId;
    };

    try {
      let handled = true;

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const subscriptionId = idOf(session.subscription);
          if (subscriptionId) {
            const synced = await syncSubscription(subscriptionId, session.client_reference_id);
            if (!synced) handled = false;
          } else {
            handled = false;
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
        case "customer.subscription.paused":
        case "customer.subscription.resumed":
        case "customer.subscription.collection_paused":
        case "customer.subscription.collection_resumed": {
          const subscription = event.data.object as Stripe.Subscription;
          const synced = await syncSubscription(subscription.id, subscription.metadata?.nbjb_user_id);
          if (!synced) handled = false;
          break;
        }

        case "invoice.paid":
        case "invoice.payment_failed": {
          const subscriptionId = invoiceSubscriptionId(event.data.object);
          if (subscriptionId) {
            const synced = await syncSubscription(subscriptionId);
            if (!synced) handled = false;
          } else {
            handled = false;
          }
          break;
        }

        default:
          handled = false;
      }

      const finalStatus = handled ? "processed" : "ignored";
      const { error: finishError } = await ctx.supabaseAdmin
        .from("stripe_webhook_events")
        .update({
          status: finalStatus,
          user_id: receiptUserId,
          object_ref: receiptObjectRef,
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("event_id", event.id);

      if (finishError) throw finishError;

      return json({ received: true, status: finalStatus });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "unknown webhook processing error";
      console.error("stripe_webhook_processing_failed", message);

      await ctx.supabaseAdmin
        .from("stripe_webhook_events")
        .update({
          status: "failed",
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq("event_id", event.id);

      return json({ error: "webhook_processing_failed" }, 500);
    }
  }),
};
