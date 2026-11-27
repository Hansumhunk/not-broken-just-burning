-- Disposable CI fixture only, never production migrations.
create table public.flamewalker_premium_lessons (
 slug text primary key, track_slug text not null, lesson_number integer not null,
 title text not null, status text not null check(status in ('draft','editorial_review','published')),
 content jsonb not null, unique(track_slug,lesson_number)
);
create table public.membership_entitlements (
 user_id uuid primary key references auth.users(id), tier text not null, status text not null,
 valid_from timestamptz, valid_until timestamptz, provider text
);
alter table public.flamewalker_premium_lessons enable row level security;
alter table public.membership_entitlements enable row level security;
revoke all on public.flamewalker_premium_lessons,public.membership_entitlements from anon,authenticated;
grant all on public.flamewalker_premium_lessons,public.membership_entitlements to service_role;
-- No client Storage policies are created. Bucket is explicitly private and service-only.
