-- Retry queued provider recordings every five minutes. Tokens never appear
-- in GitHub or frontend assets; they are read only inside privileged SQL.
select cron.schedule(
  'nbjb-private-audio-ingest-retry',
  '*/5 * * * *',
  $cron$
  update public.nbjb_audio_ingest_jobs
    set status='pending', last_error='recovered_stale_attempt', updated_at=now()
    where status='processing'
      and updated_at < now() - interval '15 minutes' and attempts < 20;
  update public.nbjb_audio_ingest_jobs
    set status='failed', last_error='retry_limit_reached', updated_at=now()
    where status='pending' and attempts >= 20;
  select net.http_post(
    url := 'https://plhbvtbvtxfzulsaxuim.supabase.co/functions/v1/premium-audio-ingest',
    body := jsonb_build_object('id', id, 'token', job_token),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 65000
  ) from (
    select id, job_token
    from public.nbjb_audio_ingest_jobs
    where status='pending' and attempts < 20
      and created_at > now() - interval '3 days'
    order by created_at asc
    limit 4
  ) outstanding;
  $cron$
);