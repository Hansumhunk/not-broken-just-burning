alter table public.nbjb_audio_ingest_jobs add column if not exists replace_existing boolean not null default false;
