// Retry only a definitive zero-row CAS miss. Never reuse stale provider data,
// bypass the revision fence, or retry an ambiguous database/Stripe error here.
// The receipt remains owned by the same handler; bounded effort is far below
// its 15-minute lease. Exhaustion returns a retryable 503 to Stripe.
export const MAX_REVISION_ATTEMPTS = 6;
export const REVISION_BUDGET_MS = 45_000;
export async function retryMembershipRevision(attempt, {
  now = Date.now, random = Math.random, sleep = ms => new Promise(r => setTimeout(r, ms))
} = {}) {
  const deadline = now() + REVISION_BUDGET_MS;
  for (let i = 0; i < MAX_REVISION_ATTEMPTS; i++) {
    if (i > 0 && now() >= deadline) break;
    if (await attempt()) return;
    if (i + 1 >= MAX_REVISION_ATTEMPTS) break;
    const delay = Math.min(400, 25 * 2 ** i) + Math.floor(random() * 25);
    if (now() + delay >= deadline) break;
    await sleep(delay);
  }
  throw new Error("membership_revision_conflict");
}
