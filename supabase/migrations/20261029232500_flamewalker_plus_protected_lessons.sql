-- Flamewalker+ editorial lesson storage. No premium lesson body belongs in public GitHub Pages.
-- Only a trusted, authenticated Edge Function may return a published body after an entitlement check.
create table if not exists public.flamewalker_premium_lessons (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  track_slug text not null check (track_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  lesson_number integer not null check (lesson_number between 1 and 999),
  title text not null check (length(title) between 3 and 200),
  summary text not null default '',
  content jsonb not null default '{}'::jsonb,
  status text not null default 'editorial_review'
    check (status in ('draft', 'editorial_review', 'published')),
  updated_at timestamptz not null default now(),
  unique (track_slug, lesson_number)
);
alter table public.flamewalker_premium_lessons enable row level security;
revoke all privileges on public.flamewalker_premium_lessons from public, anon, authenticated;
grant select, insert, update, delete on public.flamewalker_premium_lessons to service_role;
comment on table public.flamewalker_premium_lessons is
  'Protected educational text and exercise prompts. Browser roles have no access; only trusted server-side entitlement-checked delivery may expose published rows.';
