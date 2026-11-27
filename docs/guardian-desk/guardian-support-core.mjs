// NBJB Guardian Desk — pure, source-only input contract (no network or billing side effects).
export const TOPICS = Object.freeze([
  'account_login', 'free_membership', 'premium_membership',
  'products_downloads', 'billing_subscriptions', 'education_navigation',
  'technical_problem', 'privacy_data', 'general_feedback'
]);
export const TEAM_BY_TOPIC = Object.freeze({
  account_login: 'guardian_infrastructure',
  free_membership: 'customer_experience',
  premium_membership: 'customer_experience',
  products_downloads: 'revenue_forge',
  billing_subscriptions: 'revenue_forge',
  education_navigation: 'education',
  technical_problem: 'guardian_infrastructure',
  privacy_data: 'executive_command',
  general_feedback: 'customer_experience'
});
const ALLOWED = new Set(['topic','summary','feature_slug']);
const CREDENTIALS = [
  /\b(?:password|passcode|otp|one.time.code|recovery.code|access.token|refresh.token|api.key|secret.key)\s*[:=]\s*\S+/i,
  /\b(?:sk_live|sk_test|sb_secret|eyJ[A-Za-z0-9_-]{20,})[A-Za-z0-9_.-]*/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:\d[ -]*?){13,19}\b/
];
const DANGER = [
  /\b(?:i(?:\s+am|['’]m)?\s+(?:going to|about to|want to|plan to|might|will)\s+(?:kill myself|end my life|take my own life|hurt myself|die)|suicid(?:al|e)|overdos(?:e|ing)|(?:i )?(?:cannot|can't) keep myself safe)\b/i,
  /\b(?:i(?:\s+am|['’]m)?\s+(?:going to|about to|plan to|want to)\s+(?:kill|hurt) someone|immediate danger|life.threatening emergency|someone is threatening to kill me)\b/i
];
export function containsSecret(input) {
  return CREDENTIALS.some(re => re.test(input));
}
export function isImmediateDanger(input) {
  return DANGER.some(re => re.test(input));
}
export function emergencyResponse() {
  return { kind: 'safety', message: 'For immediate danger or a medical emergency in the United States, call 911. For suicide or emotional crisis support, call or text 988. NBJB is not an emergency response or therapy service. No support ticket has been submitted.' };
}
export function validateSubmission(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, code: 'INVALID_BODY' };
  if (Object.keys(payload).some(k => !ALLOWED.has(k))) return { ok: false, code: 'UNEXPECTED_FIELD' };
  const { topic, summary, feature_slug } = payload;
  if (typeof topic !== 'string' || !TOPICS.includes(topic)) return { ok: false, code: 'INVALID_TOPIC' };
  if (typeof summary !== 'string') return { ok: false, code: 'INVALID_SUMMARY' };
  const text = summary.trim();
  if (text.length < 10 || text.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return { ok: false, code: 'INVALID_SUMMARY' };
  if (containsSecret(text)) return { ok: false, code: 'SENSITIVE_CONTENT' };
  if (feature_slug !== undefined && feature_slug !== null &&
      (typeof feature_slug !== 'string' || !/^[a-z0-9][a-z0-9_/-]{0,119}$/.test(feature_slug))) return { ok: false, code: 'INVALID_FEATURE' };
  return { ok: true, topic, summary: text, feature_slug: feature_slug || null, suggested_team: TEAM_BY_TOPIC[topic] };
}
export function canonicalDedupe(userId, validated) {
  return [userId, validated.topic, validated.feature_slug || '',
    validated.summary.toLowerCase().replace(/\s+/g, ' ')].join('\u0000');
}
export function classifyTicket(validated) {
  // Verification, not customer emotion, authorizes P0/P1 escalation.
  return { priority: validated.topic === 'general_feedback' ? 'P4' : validated.topic === 'education_navigation' ? 'P3' : 'P2',
    suggested_team: validated.suggested_team, status: 'NEW' };
}
export function safePublicTicketResult(result) {
  if (!result || typeof result !== 'object' ||
      typeof result.ticket_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.ticket_id) ||
      typeof result.duplicate !== 'boolean') return null;
  const allowedStatus = new Set(['NEW','TRIAGED','AWAITING_CUSTOMER','ASSIGNED','IN_PROGRESS','AWAITING_FOUNDER','RESOLVED','CLOSED','REOPENED']);
  if (!allowedStatus.has(result.status)) return null;
  return { ticket_id: result.ticket_id, duplicate: result.duplicate, status: result.status,
    message: result.duplicate ? 'An earlier request with the same details is already saved. No second ticket was created.' : 'Your request was saved. It has not yet been assigned to a human. No response time is promised.' };
}
// Executive Command consumes a single, exhaustive, mutually exclusive
// category dimension. Small cohorts need complementary suppression: publishing
// a grand total and every other category reveals the hidden category.
export function suppressedExecutiveAggregate(input, minGroup = 5) {
  const threshold = Number.isSafeInteger(minGroup) ? Math.max(5, minGroup) : 5;
  const n = input?.total;
  if (!Number.isSafeInteger(n) || n < 0) return null;
  const rawGroups = input?.groups ?? {};
  if (!rawGroups || typeof rawGroups !== 'object' || Array.isArray(rawGroups)) return null;
  const entries = Object.entries(rawGroups);
  if (entries.some(([k, v]) => !k || !Number.isSafeInteger(v) || v < 0)) return null;
  // Without complete, non-overlapping groups, the denominator is ungrounded.
  if (entries.length && entries.reduce((sum, [, v]) => sum + v, 0) !== n) return null;
  const groups = Object.fromEntries(entries.map(([k, v]) =>
    [k, v >= threshold ? v : null]));
  const suppressedKeys = entries.filter(([, v]) => v < threshold);
  if (suppressedKeys.length && n >= threshold) {
    // Hide an additional sizeable group, otherwise one small value is
    // reconstructible by subtracting the published groups from the total.
    const candidates = entries.filter(([, v]) => v >= threshold)
      .sort((a, b) => b[1] - a[1]);
    if (candidates.length) groups[candidates[0][0]] = null;
  }
  const suppressed = n < threshold || Object.values(groups).some(v => v === null);
  return { total: n >= threshold ? n : null, groups, suppressed,
    source: 'guardian_support_tickets',
    coverage: typeof input?.coverage === 'string' ? input.coverage : 'unknown',
    as_of: typeof input?.as_of === 'string' ? input.as_of : null };
}
