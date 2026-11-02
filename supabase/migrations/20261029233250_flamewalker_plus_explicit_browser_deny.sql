-- Explicit defense-in-depth deny rule for premium content browser roles.
-- Service role may bypass RLS inside the entitlement-checking Edge Function.
create policy flamewalker_premium_lessons_deny_browser
on public.flamewalker_premium_lessons
for all
to anon, authenticated
using (false)
with check (false);
