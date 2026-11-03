import { createClient } from "npm:@supabase/supabase-js@2.116.0";
// Private queue worker. No public user authorization, only a 256-bit
// one-time work credential stored in an RLS-isolated table. The requesting
// party cannot choose arbitrary URLs or storage paths.
const bucket = "nbjb-premium-audio";
const aidocPattern = /^https:\/\/www\.aidocmaker\.com\/g0\/audio\?name=[a-f0-9]{32}$/;
const heygenPattern = /^https:\/\/resource2\.heygen\.ai\/text_to_speech\/[a-f0-9]{32}\/[a-f0-9]{32}\/id=[a-f0-9-]{36}\.wav$/;
function validProvider(url: string) { return aidocPattern.test(url) || heygenPattern.test(url); }
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const tokenPattern = /^[a-f0-9]{64}$/;

const response = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "private, no-store" }
});
function safeCompare(a: string, b: string) {
  if (a.length !== 64 || b.length !== 64) return false;
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function validAudio(bytes: Uint8Array, isWav: boolean) {
  if (isWav) return bytes.length >= 1000 && bytes.length <= 25 * 1024 * 1024 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;

  return bytes.length >= 1000 && bytes.length <= 25 * 1024 * 1024 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
     (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
}
Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const sbUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !key) return response({ error: "worker_not_configured" }, 503);
  let args: { id?: unknown; token?: unknown };
  try { args = await request.json(); }
  catch { return response({ error: "bad_json" }, 400); }
  if (typeof args.id !== "string" || !idPattern.test(args.id) ||
      typeof args.token !== "string" || !tokenPattern.test(args.token)) {
    return response({ error: "unauthorized" }, 401);
  }
  const admin = createClient(sbUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: job, error } = await admin.from("nbjb_audio_ingest_jobs")
    .select("id,slug,section,provider_url,job_token,status,attempts")
    .eq("id", args.id).maybeSingle();
  if (error) return response({ error: "queue_unavailable" }, 503);
  if (!job || !safeCompare(args.token, job.job_token)) return response({ error: "unauthorized" }, 401);
  if (job.status !== "pending") return response({ state: job.status });
  if (job.attempts >= 20 || !validProvider(job.provider_url)) {
    await admin.from("nbjb_audio_ingest_jobs").update({
      status: "failed", last_error: "invalid_provider_or_retry_limit", updated_at: new Date().toISOString()
    }).eq("id", job.id).eq("status", "pending");
    return response({ error: "import_rejected" }, 422);
  }
  const { data: claimed, error: claimError } = await admin.from("nbjb_audio_ingest_jobs")
    .update({ status: "processing", attempts: job.attempts + 1, last_error: null,
      updated_at: new Date().toISOString() })
    .eq("id", job.id).eq("status", "pending").select("id").maybeSingle();
  if (claimError || !claimed) return response({ state: "in_progress" });
  async function update(state: "pending" | "saved" | "conflict" | "failed", note: string | null, bytes?: number) {
    await admin.from("nbjb_audio_ingest_jobs").update({
      status: state, last_error: note, ...(bytes == null ? {} : { bytes }),
      updated_at: new Date().toISOString()
    }).eq("id", job.id).eq("status", "processing");
  }
  // The provider can serve MPEG bytes from a URL ending in .wav. Trust the
  // actual file signature, not the filename or response extension.
  try {
    // Verify the target is missing; never replace founder-approved MP3s.
    const { data: existing, error: lookupError } = await admin.storage.from(bucket)
      .list(job.slug, { limit: 150 });
    if (lookupError) {
      await update("pending", "storage_lookup_failed");
      return response({ error: "storage_unavailable" }, 503);
    }
    if ((existing || []).some((item) => item.name === "section-" + job.section + ".mp3" || item.name === "section-" + job.section + ".wav")) {
      await update("conflict", "existing_recording_protected");
      return response({ error: "recording_already_present" }, 409);
    }
    // Audio Doc Maker can take time to finish a queued recording. The worker
    // retries later when the provider has not yet served an MP3.
    const provider = await fetch(job.provider_url, {
      redirect: "follow", signal: AbortSignal.timeout(60000),
      headers: { "Accept": "audio/mpeg, application/octet-stream" }
    });
    if (!provider.ok) {
      await update(job.attempts + 1 >= 20 ? "failed" : "pending",
        "provider_http_" + provider.status);
      return response({ state: "provider_not_ready", provider_status: provider.status }, 202);
    }
    const length = Number(provider.headers.get("content-length") || 0);
    if (length > 25 * 1024 * 1024) {
      await update("failed", "audio_too_large");
      return response({ error: "audio_too_large" }, 413);
    }
    const raw = new Uint8Array(await provider.arrayBuffer());
    const isWav = raw.length > 12 &&
      raw[0] === 0x52 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x46 &&
      raw[8] === 0x57 && raw[9] === 0x41 && raw[10] === 0x56 && raw[11] === 0x45;
    if (!validAudio(raw, isWav)) {
      const mime = (provider.headers.get("content-type") || "unknown").slice(0,48).replace(/[^a-zA-Z0-9/;.=+ -]/g, "");
      const head = [...raw.slice(0, 12)].map((n) => n.toString(16).padStart(2, "0")).join("");
      const reason = "provider_format_mismatch:" + mime + ":" + raw.length + ":" + head;
      await update(job.attempts + 1 >= 20 ? "failed" : "pending", reason);
      return response({ state: "provider_not_ready", mime, bytes: raw.length, header: head }, 202);
    }
    const path = job.slug + "/section-" + job.section + (isWav ? ".wav" : ".mp3");
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, raw, {
      contentType: isWav ? "audio/wav" : "audio/mpeg", cacheControl: "3600", upsert: false
    });
    if (uploadError) {
      await update("failed", "storage_upload_failed_check_target_before_retry");
      return response({ error: "storage_upload_failed" }, 503);
    }
    await update("saved", null, raw.length);
    return response({ saved: true, lesson: job.slug, section: job.section, format: isWav ? "wav" : "mp3", bytes: raw.length });
  } catch {
    await update(job.attempts + 1 >= 20 ? "failed" : "pending", "provider_fetch_failed");
    return response({ state: "provider_not_ready" }, 202);
  }
});