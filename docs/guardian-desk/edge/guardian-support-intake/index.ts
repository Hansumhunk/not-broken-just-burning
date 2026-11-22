// SOURCE-ONLY Guardian Desk intake candidate. NOT deployed or authorized for QA writes.
// Future QA deployment MUST keep verify_jwt=true, set strict project/origin guards,
// bundle ../../guardian-support-core.mjs and separately authorize schema migration.
import {
  validateSubmission, isImmediateDanger, emergencyResponse,
  canonicalDedupe, safePublicTicketResult
} from '../../guardian-support-core.mjs';

const QA_REF = 'fgpkejlmpfkxgpktgdzm';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (value: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(value), {
    status, headers: { 'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store', ...extra }
  });

export function gateEnvironment(get: (key: string) => string | undefined) {
  const url = get('SUPABASE_URL') || '';
  const origin = get('NBJB_GUARDIAN_ALLOWED_ORIGIN') || '';
  return get('NBJB_GUARDIAN_QA_ENABLED') === 'true' &&
    get('NBJB_GUARDIAN_PROJECT_REF') === QA_REF &&
    url === `https://${QA_REF}.supabase.co` &&
    /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin) &&
    !!(get('SUPABASE_SERVICE_ROLE_KEY') &&
       (get('SUPABASE_PUBLISHABLE_KEY') || get('SUPABASE_ANON_KEY')) &&
       (get('NBJB_GUARDIAN_HMAC_SECRET') || '').length >= 32);
}

const MAX_BODY_BYTES = 4000;

// Trust neither Content-Length nor the browser to enforce a body-size cap.
// Read only up to the actual UTF-8 byte limit so a chunked request cannot
// consume unlimited memory before JSON validation. Never retain raw bytes.
async function readLimitedBody(req: Request): Promise<string | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

async function keyedFingerprint(secret: string, canonical: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
}

export async function handle(req: Request, get: (key: string) => string | undefined = (key) => Deno.env.get(key)) {
  if (!gateEnvironment(get)) return json({ code: 'SUPPORT_DISABLED', message: 'Support ticket intake is not enabled.' }, 503);
  const origin = req.headers.get('origin');
  const allowedOrigin = get('NBJB_GUARDIAN_ALLOWED_ORIGIN')!;
  if (origin && origin !== allowedOrigin) return json({ code: 'ORIGIN_DENIED' }, 403);
  const cors: HeadersInit = { 'access-control-allow-origin': allowedOrigin, 'vary': 'Origin' };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204,
    headers: { ...cors, 'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'authorization, apikey, content-type' } });
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405, cors);
  const token = req.headers.get('authorization')?.match(/^Bearer\s+([A-Za-z0-9._~-]+)$/i)?.[1];
  if (!token || token.length > 6000) return json({ code: 'AUTH_REQUIRED' }, 401, cors);
  const url = get('SUPABASE_URL')!;
  const userKey = get('SUPABASE_PUBLISHABLE_KEY') || get('SUPABASE_ANON_KEY')!;
  let userId: string | undefined;
  try {
    // Provider-side identity verification. Never decode a JWT and trust `sub`
    // or accept a client-supplied owner ID as proof of ownership.
    const auth = await fetch(`${url}/auth/v1/user`, {
      headers: { authorization: `Bearer ${token}`, apikey: userKey },
      signal: AbortSignal.timeout(6000)
    });
    if (!auth.ok) return json({ code: 'AUTH_REQUIRED' }, 401, cors);
    const user = await auth.json();
    if (user.is_anonymous === true || typeof user.id !== 'string' || !UUID.test(user.id))
      return json({ code: 'AUTH_REQUIRED' }, 401, cors);
    userId = user.id;
  } catch (_) {
    return json({ code: 'AUTH_UNAVAILABLE', message: 'Unable to verify the session. No ticket was created.' }, 503, cors);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') || ''))
    return json({ code: 'UNSUPPORTED_MEDIA_TYPE' }, 415, cors);
  let body: unknown;
  try {
    const claimedLength = Number(req.headers.get('content-length') || '0');
    if (!Number.isFinite(claimedLength) || claimedLength > MAX_BODY_BYTES)
      return json({ code: 'INVALID_BODY' }, 400, cors);
    const raw = await readLimitedBody(req);
    if (raw === null) return json({ code: 'INVALID_BODY' }, 400, cors);
    body = JSON.parse(raw);
  } catch (_) { return json({ code: 'INVALID_JSON' }, 400, cors); }
  const input = validateSubmission(body);
  if (!input.ok) return json({ code: input.code, message: 'Review the issue without sharing credentials or private records. No ticket was created.' }, 400, cors);
  if (isImmediateDanger(input.summary)) return json(emergencyResponse(), 200, cors);
  const fingerprint = await keyedFingerprint(get('NBJB_GUARDIAN_HMAC_SECRET')!, canonicalDedupe(userId, input));
  try {
    // SECURITY DEFINER RPC is service_role-only with atomic rate + ticket + audit.
    // The key never leaves server memory; do not send raw customer messages to logs.
    const saved = await fetch(`${url}/rest/v1/rpc/guardian_support_accept`, {
      method: 'POST',
      headers: { authorization: `Bearer ${get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        apikey: get('SUPABASE_SERVICE_ROLE_KEY')!, 'content-type': 'application/json' },
      body: JSON.stringify({ p_owner_user_id: userId, p_topic: input.topic,
        p_feature_slug: input.feature_slug, p_summary: input.summary,
        p_dedupe_fingerprint: fingerprint }),
      signal: AbortSignal.timeout(7000)
    });
    if (!saved.ok) {
      const failure = await saved.json().catch(() => ({}));
      if (saved.status === 429 || failure?.code === 'P1001') return json({ code: 'RATE_LIMIT', message: 'Too many requests. No new ticket was created.' }, 429, cors);
    }
    if (!saved.ok) return json({ code: 'PERSISTENCE_UNCONFIRMED', message: 'We could not confirm receipt. No ticket confirmation is being issued.' }, 503, cors);
    const result = safePublicTicketResult(await saved.json());
    if (!result) return json({ code: 'PERSISTENCE_UNCONFIRMED', message: 'Ticket confirmation was unavailable. Please use the existing NBJB contact email.' }, 503, cors);
    return json(result, result.duplicate ? 200 : 201, cors);
  } catch (_) {
    return json({ code: 'PERSISTENCE_UNCONFIRMED', message: 'We could not confirm receipt. Please use the existing NBJB contact email.' }, 503, cors);
  }
}

// Deno runtime entrypoint; unit tests import `handle` with synthetic fetch/env stubs.
if (import.meta.main) Deno.serve((req) => handle(req));
