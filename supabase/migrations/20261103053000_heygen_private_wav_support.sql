-- Allow an exact HeyGen speech WAV delivery URL in the private import queue.
-- Bucket remains private and accepts only narration audio.
alter table public.nbjb_audio_ingest_jobs
  drop constraint nbjb_audio_ingest_jobs_provider_url_check;
alter table public.nbjb_audio_ingest_jobs
  add constraint nbjb_audio_ingest_jobs_provider_url_check
  check (
    provider_url ~ '^https://www[.]aidocmaker[.]com/g0/audio[?]name=[a-f0-9]{32}$'
    or provider_url ~ '^https://resource2[.]heygen[.]ai/text_to_speech/[a-f0-9]{32}/[a-f0-9]{32}/id=[a-f0-9-]{36}[.]wav$'
  );
update storage.buckets
set allowed_mime_types=array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav']::text[]
where id='nbjb-premium-audio' and public=false;