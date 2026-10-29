import { withSupabase } from "npm:@supabase/server@1.7.0";

// Never place premium lesson bodies, billing secrets, or user journal data in static GitHub Pages.
const noStore = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" };
function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
    const userId = ctx.userClaims?.id;
    if (!userId) return reply({ error: "unauthorized" }, 401);

    let body: { slug?: unknown };
    try { body = await req.json(); }
    catch { return reply({ error: "invalid_json" }, 400); }

    // Catalog lists non-sensitive titles/statuses only, and works for all signed-in members.
    // It NEVER returns the private lesson body or private source document IDs.
    if (body?.action === "catalog") {
      const { data: rows, error: listError } = await ctx.supabaseAdmin
        .from("flamewalker_premium_lessons")
        .select("slug,track_slug,lesson_number,title,summary,status")
        .in("status", ["published", "editorial_review"])
        .order("lesson_number", { ascending: true });
      if (listError) return reply({ error: "catalog_unavailable" }, 503);
      return reply({ lessons: rows || [] });
    }

    const slug = body?.slug;
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
      return reply({ error: "invalid_lesson" }, 400);
    }

    // Entitlement comes only from the privileged database record, never caller-controlled metadata.
    const { data: member, error: memberError } = await ctx.supabaseAdmin
      .from("membership_entitlements")
      .select("tier,status,valid_from,valid_until")
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
      && goodDate(member.valid_until, true);

    if (!entitled) return reply({ error: "paid_membership_required" }, 403);

    const { data: lesson, error: lessonError } = await ctx.supabaseAdmin
      .from("flamewalker_premium_lessons")
      .select("slug,track_slug,lesson_number,title,summary,content,updated_at")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (lessonError) {
      console.error("premium_lesson_read_failed", lessonError.message);
      return reply({ error: "content_unavailable" }, 503);
    }
    if (!lesson) return reply({ error: "lesson_not_available" }, 404);

    return reply({ lesson });
  }),
};
