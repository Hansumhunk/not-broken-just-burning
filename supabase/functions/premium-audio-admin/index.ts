import { withSupabase } from "npm:@supabase/server@1.7.0";

// Private editorial tooling only: never grant storage write permissions to
// free or paid members, never store credentials in the static website.
const BUCKET = "nbjb-premium-audio";
const noStore = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" };
const major = /^(?:OPENING|LESSON PURPOSE|PART \d+\b|THE (?:FATHER IMPRINT MAP|MATERNAL IMPRINT MAP|SILENCE INVENTORY|SMALLER DOOR)|NEXT HONEST ACTION|THE NEXT HONEST ACTION|OPTIONAL SPIRITUAL LENS|INTEGRATION|FINAL REFLECTION|PRIVACY NOTE|PROFESSIONAL(?:\s|\/|$))/i;

function respond(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}

type Block = { type?: string; text?: string };
type Page = { number: number; title: string; characters: number; words: number; excerpt: string; narration: string };

function pagesFor(content: unknown, lessonSlug: string): Page[] {
  const input = content && typeof content === "object" && !Array.isArray(content)
    ? (content as { blocks?: unknown }).blocks : null;
  const blocks = Array.isArray(input) ? input.slice(0, 800) : [];
  // Match the private member reader's per-lesson section limits exactly.
  // Keep Father Wound section numbers unchanged: recordings already exist.
  const minSplitLength = lessonSlug === "mother-wound" ? 1200 : 900;
  const blockLimit = lessonSlug === "mother-wound" ? 22 : 11;
  const pages: Page[] = [];
  let title = "Opening";
  let text: string[] = [];
  let length = 0;
  let continuation = 0;

  function flush() {
    if (!text.length) return;
    const source = text.join(" ");
    const pageTitle = continuation ? title + " · continued " + (continuation + 1) : title;
    pages.push({
      number: pages.length + 1,
      title: pageTitle,
      characters: source.length,
      words: (source.match(/\S+/g) || []).length,
      excerpt: source.replace(/\s+/g, " ").slice(0, 170),
      narration: pageTitle + ".\n\n" + text.join("\n\n")
    });
    text = [];
    length = 0;
    continuation++;
  }

  for (const raw of blocks) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as Block;
    if (typeof block.text !== "string" || !block.text.trim()) continue;
    const value = block.text.trim();
    if (block.type === "heading" && major.test(value)) {
      flush();
      title = value.replace(/\s+/g, " ").trim();
      continuation = 0;
      continue;
    }
    if (text.length && length > minSplitLength && (length + value.length > 1800 || text.length >= blockLimit)) flush();
    text.push(value);
    length += value.length;
  }
  flush();
  return pages;
}

function validSlug(value: unknown) {
  return typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);
    const editorId = Deno.env.get("NBJB_SANDBOX_TEST_USER_ID");
    const userId = ctx.userClaims?.id;
    // Fail closed, including when a secret is absent or not configured.
    if (!userId || !editorId || userId !== editorId) return respond({ error: "editorial_access_required" }, 403);
    let body: { action?: unknown; slug?: unknown; files?: unknown; section?: unknown; consent?: unknown };
    try { body = await req.json(); } catch { return respond({ error: "invalid_json" }, 400); }

    if (body.action === "overview") {
      const { data, error } = await ctx.supabaseAdmin
        .from("flamewalker_premium_lessons")
        .select("slug,title,lesson_number,status,content")
        .in("status", ["editorial_review", "published"])
        .order("lesson_number", { ascending: true });
      if (error) return respond({ error: "catalog_unavailable" }, 503);
      return respond({ lessons: (data || []).map((lesson) => ({
        slug: lesson.slug,
        title: lesson.title,
        status: lesson.status,
        pages: pagesFor(lesson.content, lesson.slug).length
      })) });
    }

    if (!validSlug(body.slug)) return respond({ error: "invalid_lesson" }, 400);
    const slug = body.slug as string;
    const { data: lesson, error: lessonError } = await ctx.supabaseAdmin
      .from("flamewalker_premium_lessons")
      .select("slug,title,status,content")
      .eq("slug", slug)
      .in("status", ["editorial_review", "published"])
      .maybeSingle();
    if (lessonError) return respond({ error: "lesson_unavailable" }, 503);
    if (!lesson) return respond({ error: "lesson_not_found" }, 404);
    const pages = pagesFor(lesson.content, slug);
    if (!pages.length || pages.length > 100) return respond({ error: "invalid_lesson_pages" }, 503);

    const storage = ctx.supabaseAdmin.storage.from(BUCKET);
    const { data: objects, error: listError } = await storage.list(slug, { limit: 150 });
    if (listError) return respond({ error: "storage_inventory_unavailable" }, 503);
    const uploaded = (objects || [])
      .filter((obj) => /^section-[1-9]\d*\.mp3$/i.test(obj.name || ""))
      .map((obj) => ({
        name: obj.name,
        section: Number(obj.name.match(/\d+/)?.[0]),
        bytes: Number(obj.metadata?.size) || null,
        updatedAt: obj.updated_at || null
      }));
    if (body.action === "details") {
      return respond({ lesson: { slug, title: lesson.title, status: lesson.status },
        pages: pages.map(({ narration: _privateText, ...page }) => page), uploaded });
    }

    // A server-only provider key makes automatic generation possible without
    // copying private lesson content, downloading MP3s, or repeating uploads.
    // This is intentionally disabled until both secrets are explicitly set.
    const ttsKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
    const voiceId = Deno.env.get("NBJB_ELEVENLABS_VOICE_ID") || "";
    const configured = Boolean(ttsKey && /^[a-zA-Z0-9]{10,80}$/.test(voiceId));
    if (body.action === "tts_status") {
      const existing = new Set(uploaded.map((item) => item.section));
      return respond({
        configured, provider: "ElevenLabs", model: "eleven_multilingual_v2",
        estimate_usd_per_1000_chars: 0.10,
        pages: pages.map((page) => ({
          number: page.number, title: page.title,
          characters: page.narration.length, words: page.words,
          exists: existing.has(page.number)
        }))
      });
    }
    if (body.action === "tts_generate") {
      if (!configured) return respond({ error: "voice_provider_not_configured" }, 503);
      if (body.consent !== true) return respond({ error: "explicit_paid_generation_consent_required" }, 400);
      const section = body.section;
      if (typeof section !== "number" || !Number.isInteger(section) ||
          section < 1 || section > pages.length) return respond({ error: "invalid_page" }, 400);
      if (uploaded.some((item) => item.section === section)) {
        return respond({ error: "recording_already_exists", section }, 409);
      }
      const page = pages[section - 1];
      const narration = page.narration.trim();
      if (narration.length < 20 || narration.length > 6000) {
        return respond({ error: "narration_text_out_of_bounds" }, 400);
      }

      // The browser requests exactly one page per call. It coordinates a
      // sequential batch, can stop, and never silently retries a charged job.
      // No audio-provider credentials or premium text enter GitHub Pages assets.
      let voice: Response;
      try {
        voice = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" +
          encodeURIComponent(voiceId) + "?output_format=mp3_44100_128", {
          method: "POST",
          headers: {
            "xi-api-key": ttsKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
          },
          body: JSON.stringify({
            text: narration,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.62, similarity_boost: 0.75 }
          }),
          signal: AbortSignal.timeout(110_000)
        });
      } catch {
        return respond({ error: "tts_provider_unreachable" }, 503);
      }
      if (!voice.ok) {
        return respond({ error: "tts_provider_rejected_request", provider_status: voice.status }, 502);
      }
      const declaredType = voice.headers.get("content-type") || "";
      if (!declaredType.includes("audio/") && !declaredType.includes("application/octet-stream")) {
        return respond({ error: "tts_provider_unexpected_response" }, 502);
      }
      let bytes: Uint8Array;
      try { bytes = new Uint8Array(await voice.arrayBuffer()); }
      catch { return respond({ error: "tts_audio_transfer_failed" }, 502); }
      if (bytes.length < 1000 || bytes.length > 25 * 1024 * 1024 ||
          !((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
            (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) {
        return respond({ error: "tts_provider_invalid_mp3" }, 502);
      }
      const path = slug + "/section-" + section + ".mp3";
      const { error: uploadError } = await storage.upload(path, bytes, {
        contentType: "audio/mpeg", upsert: false, cacheControl: "3600"
      });
      if (uploadError) {
        // A failed upload may have consumed provider credits. Do not retry
        // automatically; the editor should inspect private storage first.
        return respond({ error: "tts_generated_but_storage_upload_failed", section }, 503);
      }
      return respond({ saved: true, section, bytes: bytes.length, characters: narration.length });
    }
    if (body.action !== "prepare") return respond({ error: "invalid_action" }, 400);

    const files = body.files;
    if (!Array.isArray(files) || files.length < 1 || files.length > 25) {
      return respond({ error: "invalid_batch_size" }, 400);
    }
    const seen = new Set<number>();
    const maxBytes = 25 * 1024 * 1024;
    for (const raw of files) {
      if (!raw || typeof raw !== "object") return respond({ error: "invalid_file" }, 400);
      const section = (raw as { section?: unknown }).section;
      const bytes = (raw as { bytes?: unknown }).bytes;
      if (typeof section !== "number" || !Number.isInteger(section) ||
          section < 1 || section > pages.length ||
          typeof bytes !== "number" || !Number.isInteger(bytes) || bytes < 1000 || bytes > maxBytes ||
          seen.has(section)) {
        return respond({ error: "invalid_file_mapping" }, 400);
      }
      seen.add(section);
    }
    const existing = new Set(uploaded.map((obj) => obj.section));
    const conflicts = files.map((entry) => entry.section).filter((section) => existing.has(section));
    if (conflicts.length) return respond({ error: "files_already_exist", sections: conflicts }, 409);

    const grants: Array<{ section: number; path: string; token: string }> = [];
    for (const entry of files as Array<{ section: number }>) {
      const path = slug + "/section-" + entry.section + ".mp3";
      // Signed upload tokens expire after two hours and are path-specific.
      // Upsert is intentionally disabled, so the user cannot silently replace
      // a recording that already exists.
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error || !data?.token) return respond({ error: "upload_authorization_failed" }, 503);
      grants.push({ section: entry.section, path, token: data.token });
    }
    return respond({ bucket: BUCKET, uploads: grants });
  })
};