import { withSupabase } from "npm:@supabase/server@1.7.0";

// Never place premium lesson bodies, billing secrets, or user journal data in static GitHub Pages.
const noStore = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" };
// A fixed release-bound mapping, never a caller-supplied bucket, path, or URL.
// No private manuscript, review link, or PDF bytes are stored in this repository.
// The object is NOT provisioned by this code; separate release authorization is required.
const fortressSlug = "when-protection-becomes-a-prison";
const fortressEdition = "Fortress Project v1.1 (Directive 002)";
const fortressWorkbook = {
  bucket: "nbjb-private-products",
  key: "curriculum/fortress/fortress-audit-v1.1.pdf",
  filename: "The-Fortress-Audit.pdf",
  bytes: 182857,
  sha256: "f4561ff8594405d372f33309bdea111bc2fecdd45e5e56eb4ffdcb1413b60604",
};
function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
    const userId = ctx.userClaims?.id;
    if (!userId) return reply({ error: "unauthorized" }, 401);
    const isEditorialReviewer = userId === Deno.env.get("NBJB_SANDBOX_TEST_USER_ID");

    let body: { slug?: unknown; action?: unknown; section?: unknown };
    try { body = await req.json(); }
    catch { return reply({ error: "invalid_json" }, 400); }

    // The former AI Doc Maker recording set is incomplete and retired.
    // Return no playback URL even if an old browser caches the former audio UI.
    // Historical files remain private and untouched in Storage.
    if (body?.action === "audio") return reply({ available: false, error: "narration_paused" }, 410);

    // Catalog lists non-sensitive titles/statuses only, and works for all signed-in members.
    // It NEVER returns the private lesson body or private source document IDs.
    if (body?.action === "catalog") {
      const { data: rows, error: listError } = await ctx.supabaseAdmin
        .from("flamewalker_premium_lessons")
        .select("slug,track_slug,lesson_number,title,summary,status")
        .in("status", ["published", "editorial_review"])
        .order("lesson_number", { ascending: true });
      if (listError) return reply({ error: "catalog_unavailable" }, 503);
      // Preserve existing catalog behavior for other lessons; the new candidate is invisible to ordinary accounts until published.
      return reply({ lessons: (rows || []).filter(row => row.slug !== fortressSlug || row.status === "published" || isEditorialReviewer) });
    }

    const slug = body?.slug;
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
      return reply({ error: "invalid_lesson" }, 400);
    }

    // Entitlement comes only from the privileged database record, never caller-controlled metadata.
    const { data: member, error: memberError } = await ctx.supabaseAdmin
      .from("membership_entitlements")
      .select("tier,status,valid_from,valid_until,provider")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      console.error("premium_entitlement_read_failed", memberError.message);
      return reply({ error: "access_unavailable" }, 503);
    }

    const now = Date.now();
    const goodDate = (v: string | null, defaultIfNull: boolean) =>
      v == null ? defaultIfNull : Number.isFinite(Date.parse(v)) && (defaultIfNull ? Date.parse(v) > now : Date.parse(v) <= now);
    const entitled = member?.tier === "paid_member"
      && ["active", "trialing", "past_due"].includes(member.status)
      && goodDate(member.valid_from, false)
      && (member.provider !== "stripe" || member.valid_until != null)
      && goodDate(member.valid_until, true);

    // Only the nominated internal test account may review unpublished drafts.
    // The reviewer UUID is read from Supabase Secrets, never from the browser.
    if (!entitled && !isEditorialReviewer) return reply({ error: "paid_membership_required" }, 403);

    let lessonQuery = ctx.supabaseAdmin
      .from("flamewalker_premium_lessons")
      .select("slug,track_slug,lesson_number,title,summary,status,content,updated_at")
      .eq("slug", slug);
    lessonQuery = isEditorialReviewer
      ? lessonQuery.in("status", ["published", "editorial_review"])
      : lessonQuery.eq("status", "published");
    const { data: lesson, error: lessonError } = await lessonQuery.maybeSingle();

    if (lessonError) {
      console.error("premium_lesson_read_failed", lessonError.message);
      return reply({ error: "content_unavailable" }, 503);
    }
    if (!lesson) return reply({ error: "lesson_not_available" }, 404);

    // Keep the nominated reviewer exception for existing manuscripts. A new
    // workbook requires current paid access to a published lesson, OR the
    // nominated reviewer reading this exact editorial-review edition.
    const workbookEligible = slug === fortressSlug
      && lesson.content?.sourceEdition === fortressEdition
      && lesson.content?.workbook?.slug === "fortress-audit"
      && ((lesson.status === "published" && entitled)
        || (lesson.status === "editorial_review" && isEditorialReviewer));
    if (body?.action === "workbook") {
      if (!workbookEligible) return reply({ error: "workbook_not_available" }, 404);
      try {
        const { data: file, error: fileError } = await ctx.supabaseAdmin.storage
          .from(fortressWorkbook.bucket).download(fortressWorkbook.key);
        if (fileError || !file || file.size !== fortressWorkbook.bytes) {
          return reply({ error: "workbook_unavailable" }, 503);
        }
        const bytes = await file.arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
          .map(n => n.toString(16).padStart(2, "0")).join("");
        if (digest !== fortressWorkbook.sha256) return reply({ error: "workbook_unavailable" }, 503);
        // Recheck authorization after the private asset read, immediately before
        // emitting bytes. No signed bearer URL remains usable after revocation.
        const { data: latestMember, error: latestError } = await ctx.supabaseAdmin
          .from("membership_entitlements").select("tier,status,valid_from,valid_until,provider")
          .eq("user_id", userId).maybeSingle();
        if (latestError) return reply({ error: "access_unavailable" }, 503);
        const latestNow = Date.now();
        const latestDate = (v: string | null, future: boolean) =>
          v == null ? future : Number.isFinite(Date.parse(v)) &&
            (future ? Date.parse(v) > latestNow : Date.parse(v) <= latestNow);
        const latestEntitled = latestMember?.tier === "paid_member"
          && ["active", "trialing", "past_due"].includes(latestMember.status)
          && latestDate(latestMember.valid_from, false)
          && (latestMember.provider !== "stripe" || latestMember.valid_until != null)
          && latestDate(latestMember.valid_until, true);
        const { data: latestLesson, error: latestLessonError } = await ctx.supabaseAdmin
          .from("flamewalker_premium_lessons").select("status,content").eq("slug", slug).maybeSingle();
        if (latestLessonError) return reply({ error: "content_unavailable" }, 503);
        if (!latestLesson || latestLesson.content?.sourceEdition !== fortressEdition
          || latestLesson.content?.workbook?.slug !== "fortress-audit"
          || !((latestLesson.status === "published" && latestEntitled)
            || (latestLesson.status === "editorial_review" && isEditorialReviewer))) {
          return reply({ error: "workbook_not_available" }, 403);
        }
        // supabase-js functions.invoke recognizes octet-stream as a Blob.
        return new Response(bytes, { status: 200, headers: {
          ...noStore, "Content-Type": "application/octet-stream",
          "Content-Disposition": 'attachment; filename="' + fortressWorkbook.filename + '"',
          "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive",
        } });
      } catch (_) { return reply({ error: "workbook_unavailable" }, 503); }
    }
    // Never expose the private object key, Drive links or signed URLs.
    return reply(workbookEligible ? { lesson, workbookAvailable: true } : { lesson });
  }),
};
