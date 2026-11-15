-- Private editorial job queue: provider audio to the existing private Storage bucket.
-- No client roles may read, write or invoke entries. Server-only use.
create extension if not exists pg_net;
create extension if not exists pg_cron;
create table if not exists public.nbjb_audio_ingest_jobs (
 id uuid primary key default gen_random_uuid(),
 slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 section integer not null check (section between 1 and 100),
 provider_url text not null check (provider_url ~ '^https://www[.]aidocmaker[.]com/g0/audio[?]name=[a-f0-9]{32}$'),
 job_token text not null check (job_token ~ '^[a-f0-9]{64}$'),
 status text not null default 'pending' check (status in ('pending','processing','saved','conflict','failed')),
 attempts integer not null default 0 check (attempts between 0 and 100),
 last_error text,
 bytes integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (slug, section)
);
alter table public.nbjb_audio_ingest_jobs enable row level security;
revoke all on public.nbjb_audio_ingest_jobs from anon, authenticated, public;
grant all on public.nbjb_audio_ingest_jobs to service_role;
create index if not exists nbjb_audio_ingest_status_idx on public.nbjb_audio_ingest_jobs (status, created_at)
where status = 'pending';