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
type Page = { number: number; title: string; characters: number; words: number; excerpt: string };

function pagesFor(content: unknown): Page[] {
  const input = content && typeof content === "object" && !Array.isArray(content)
    ? (content as { blocks?: unknown }).blocks : null;
  const blocks = Array.isArray(input) ? input.slice(0, 800) : [];
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
      excerpt: source.replace(/\s+/g, " ").slice(0, 170)
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
    if (text.length && length > 900 && (length + value.length > 1800 || text.length >= 11)) flush();
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
    let body: { action?: unknown; slug?: unknown; files?: unknown };
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
        pages: pagesFor(lesson.content).length
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
    const pages = pagesFor(lesson.content);
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
        pages, uploaded });
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