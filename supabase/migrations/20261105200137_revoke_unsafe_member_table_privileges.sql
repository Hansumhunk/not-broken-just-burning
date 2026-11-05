-- Applied to NBJB Phase Two via the Supabase migration service on 2026-11-05.
-- Row level security limits normal DML by user_id, but PostgreSQL TRUNCATE
-- does not apply RLS. An ordinary authenticated member must not have TRUNCATE,
-- TRIGGER, or REFERENCES privileges on shared member tables.
--
-- These REVOKEs do not delete data, alter policies, or remove existing
-- SELECT/INSERT/UPDATE/DELETE privileges required by the member experience.

REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
  public.learning_progress,
  public.member_continue_state,
  public.member_path_progress,
  public.member_path_state,
  public.member_preferences,
  public.profiles
FROM authenticated;

-- Verify in production using has_table_privilege('authenticated',
-- 'public.learning_progress', 'TRUNCATE'), etc. All should return false.
