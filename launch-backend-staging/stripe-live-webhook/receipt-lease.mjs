// Receipt claim/reclaim policy shared by the deployed candidate and offline tests.
// No customer data or payment action takes place here.
export const RECEIPT_LEASE_MS = 15 * 60 * 1000;

/** @param {any} receipts @param {any} event @param {number} now */
export async function claimReceipt(receipts, event, now = Date.now(), live = true) {
  if (event?.livemode !== live || typeof event.id !== "string" || !event.id) return { kind: "error" };
  const lease = new Date(now).toISOString();
  const { data: existing, error: readError } = await receipts
    .select("status,received_at,livemode").eq("event_id", event.id).maybeSingle();
  if (readError) return { kind: "error" };
  if (existing) {
    if (existing.livemode !== live) return { kind: "error" };
    if (["processed", "ignored"].includes(existing.status)) return { kind: "terminal" };
    const since = Date.parse(existing.received_at);
    if (!Number.isFinite(since)) return { kind: "error" };
    if (existing.status === "processing" && now - since < RECEIPT_LEASE_MS) return { kind: "retry" };
    if (!["processing", "failed"].includes(existing.status)) return { kind: "error" };
    // Compare AND swap status and previous claim timestamp; only one handler
    // can own the retry, including concurrent retries of a failed receipt.
    const { data: claimed, error } = await receipts
      .update({ status: "processing", error_message: null, processed_at: null, received_at: lease })
      .eq("event_id", event.id)
      .eq("livemode", live)
      .eq("status", existing.status)
      .eq("received_at", existing.received_at)
      .select("event_id").maybeSingle();
    if (error) return { kind: "error" };
    return claimed ? { kind: "claimed", lease } : { kind: "retry" };
  }
  const { error } = await receipts.insert({
    event_id: event.id, event_type: event.type,
    event_created_at: new Date(event.created * 1000).toISOString(),
    livemode: live, object_ref: typeof event.data?.object?.id === "string" ? event.data.object.id : null,
    status: "processing", received_at: lease,
  });
  if (error?.code === "23505") return { kind: "retry" };
  if (error) return { kind: "error" };
  return { kind: "claimed", lease };
}
