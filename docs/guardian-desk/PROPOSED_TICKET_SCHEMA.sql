-- Guardian Desk Phase II / #275 / PR #276 — DRAFT, NOT APPLIED
-- Non-production QA proposal only. Never run without separate founder approval,
-- verified Commerce QA isolation and reviewed retention/account-deletion policy.
-- Public visitors use verified existing contact, NOT public ticket inserts.
BEGIN;

CREATE TABLE public.guardian_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Retain an internal case when Auth identity is removed; NULL severs login
  -- linkage, but DOES NOT erase the summary. An approved scrub/purge/hold
  -- workflow MUST run before deletion or during retention review.
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  topic text NOT NULL CHECK (topic IN (
    'account_login','free_membership','premium_membership',
    'products_downloads','billing_subscriptions','education_navigation',
    'technical_problem','privacy_data','general_feedback'
  )),
  feature_slug text CHECK (feature_slug IS NULL OR
    (char_length(feature_slug) BETWEEN 1 AND 120 AND feature_slug ~ '^[a-z0-9][a-z0-9_/-]*$')),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 10 AND 1200),
  priority text NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2','P3')),
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN (
    'NEW','TRIAGED','AWAITING_CUSTOMER','ASSIGNED','IN_PROGRESS',
    'AWAITING_FOUNDER','RESOLVED','CLOSED','REOPENED'
  )),
  -- Suggestion is not a claim of staff assignment.
  suggested_team text NOT NULL CHECK (suggested_team IN (
    'customer_experience','revenue_forge','guardian_infrastructure',
    'education','executive_command'
  )),
  assigned_team text CHECK (assigned_team IS NULL OR assigned_team IN (
    'customer_experience','revenue_forge','guardian_infrastructure',
    'education','executive_command'
  )),
  dedupe_fingerprint text NOT NULL CHECK (dedupe_fingerprint ~ '^[0-9a-f]{64}$'),
  last_verified_action text CHECK (last_verified_action IS NULL OR
    char_length(last_verified_action) <= 400),
  next_action text CHECK (next_action IS NULL OR char_length(next_action) <= 400),
  escalation_required boolean NOT NULL DEFAULT false,
  -- No arbitrary hardcoded retention period before policy approval.
  retention_review_at timestamptz,
  legal_hold_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  -- Fail closed: unlinking an Auth user cannot leave an orphaned case
  -- containing an identifiable summary or reusable fingerprint.
  -- A reviewed scrub/purge workflow must run before account deletion.
  CONSTRAINT guardian_support_orphan_redacted CHECK (
    owner_user_id IS NOT NULL OR
    (summary = '[REDACTED]' AND
     dedupe_fingerprint = repeat('0',64) AND
     legal_hold_reference IS NULL)
  )
);
CREATE INDEX guardian_support_tickets_owner_created_idx
  ON public.guardian_support_tickets(owner_user_id,created_at DESC);
CREATE INDEX guardian_support_tickets_status_created_idx
  ON public.guardian_support_tickets(status,created_at);
CREATE UNIQUE INDEX guardian_support_tickets_open_dedupe_uq
  ON public.guardian_support_tickets(owner_user_id,dedupe_fingerprint)
  WHERE owner_user_id IS NOT NULL AND status <> 'CLOSED';
ALTER TABLE public.guardian_support_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.guardian_support_tickets FROM PUBLIC,anon,authenticated;
GRANT SELECT (
 id,topic,feature_slug,summary,priority,status,
 last_verified_action,next_action,created_at,updated_at,closed_at
) ON public.guardian_support_tickets TO authenticated;
CREATE POLICY guardian_support_ticket_owner_read
 ON public.guardian_support_tickets FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = owner_user_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.guardian_support_tickets TO service_role;

CREATE TABLE public.guardian_support_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 -- Never silently erase audit evidence on ticket removal: explicit reviewed
 -- event deletion must precede any ticket purge, subject to retention/hold.
 ticket_id uuid NOT NULL REFERENCES public.guardian_support_tickets(id) ON DELETE RESTRICT,
 action_kind text NOT NULL CHECK (action_kind IN (
   'created','classified','assigned','status_changed','escalated',
   'reopened','resolution_verified','closed','operator_note'
 )),
 actor_kind text NOT NULL CHECK (actor_kind IN ('system','member','staff')),
 safe_note text CHECK (safe_note IS NULL OR char_length(safe_note) <= 400),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guardian_support_events_ticket_created_idx
 ON public.guardian_support_events(ticket_id,created_at);
ALTER TABLE public.guardian_support_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.guardian_support_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.guardian_support_events TO service_role;

-- Rate counters are non-evidentiary, short-lived operational metadata.
CREATE TABLE public.guardian_support_rate_windows (
 owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 window_started_at timestamptz NOT NULL,
 accepted_count integer NOT NULL CHECK (accepted_count >= 0),
 PRIMARY KEY (owner_user_id,window_started_at)
);
ALTER TABLE public.guardian_support_rate_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.guardian_support_rate_windows FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.guardian_support_rate_windows TO service_role;

-- All three writes happen in one Postgres transaction. The caller is a
-- trusted Edge Function which has ALREADY validated the bearer user JWT and
-- constructed a keyed HMAC dedupe fingerprint. Do not accept owner identity
-- from the browser. This public-schema RPC is EXECUTABLE BY SERVICE ROLE ONLY.
CREATE FUNCTION public.guardian_support_accept(
 p_owner_user_id uuid,
 p_topic text,
 p_feature_slug text,
 p_summary text,
 p_dedupe_fingerprint text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_count integer;
 v_ticket_id uuid;
 v_duplicate boolean := false;
 v_status text;
 v_team text;
 v_priority text := 'P2';
BEGIN
 IF p_owner_user_id IS NULL OR p_topic IS NULL OR p_summary IS NULL OR
    char_length(p_summary) NOT BETWEEN 10 AND 1200 OR
    (p_dedupe_fingerprint IS NULL OR p_dedupe_fingerprint !~ '^[0-9a-f]{64}$') THEN
   RAISE EXCEPTION 'invalid support intake' USING ERRCODE = '22023';
 END IF;
 IF p_feature_slug IS NOT NULL AND
    (char_length(p_feature_slug) NOT BETWEEN 1 AND 120 OR
     p_feature_slug !~ '^[a-z0-9][a-z0-9_/-]*$') THEN
   RAISE EXCEPTION 'invalid support feature' USING ERRCODE = '22023';
 END IF;
 v_team := CASE p_topic
   WHEN 'account_login' THEN 'guardian_infrastructure'
   WHEN 'free_membership' THEN 'customer_experience'
   WHEN 'premium_membership' THEN 'customer_experience'
   WHEN 'products_downloads' THEN 'revenue_forge'
   WHEN 'billing_subscriptions' THEN 'revenue_forge'
   WHEN 'education_navigation' THEN 'education'
   WHEN 'technical_problem' THEN 'guardian_infrastructure'
   WHEN 'privacy_data' THEN 'executive_command'
   WHEN 'general_feedback' THEN 'customer_experience'
   ELSE NULL END;
 IF v_team IS NULL THEN
   RAISE EXCEPTION 'invalid support topic' USING ERRCODE = '22023';
 END IF;
 IF p_topic = 'general_feedback' THEN v_priority := 'P3'; END IF;

 -- Serialize intake by owner for the duration of this transaction. This
 -- protects first-submit vs identical retry races and avoids charging rate
 -- allowance for a duplicate. The partial unique index remains a second guard.
 -- PG17 catalog hash collision only causes extra serialization, not ownership
 -- sharing; each subsequent query still filters by exact owner UUID.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_owner_user_id::text, 0)
 );
 SELECT id,status INTO v_ticket_id,v_status
 FROM public.guardian_support_tickets
 WHERE owner_user_id = p_owner_user_id
   AND dedupe_fingerprint = p_dedupe_fingerprint
   AND status <> 'CLOSED'
 ORDER BY created_at ASC LIMIT 1;
 IF v_ticket_id IS NOT NULL THEN
   RETURN jsonb_build_object('ticket_id',v_ticket_id,
                             'duplicate',true,'status',v_status);
 END IF;

 -- Only genuinely new tickets consume one of five per-user slots per hour.
 -- Atomic per-verified-user limit of five accepted requests per database hour.
 INSERT INTO public.guardian_support_rate_windows AS r
   (owner_user_id,window_started_at,accepted_count)
 VALUES (p_owner_user_id,date_trunc('hour',now()),1)
 ON CONFLICT (owner_user_id,window_started_at)
 DO UPDATE SET accepted_count = r.accepted_count + 1
 WHERE r.accepted_count < 5
 RETURNING accepted_count INTO v_count;
 IF v_count IS NULL THEN
   RAISE EXCEPTION 'rate limited' USING ERRCODE = 'P1001';
 END IF;

 INSERT INTO public.guardian_support_tickets (
   owner_user_id,topic,feature_slug,summary,priority,status,
   suggested_team,dedupe_fingerprint,next_action
 ) VALUES (
   p_owner_user_id,p_topic,p_feature_slug,p_summary,v_priority,'NEW',
   v_team,p_dedupe_fingerprint,'Ticket saved; no human assignment or response time is promised.'
 ) ON CONFLICT DO NOTHING RETURNING id,status INTO v_ticket_id,v_status;
 IF v_ticket_id IS NULL THEN
   SELECT id,status INTO v_ticket_id,v_status
   FROM public.guardian_support_tickets
   WHERE owner_user_id = p_owner_user_id
     AND dedupe_fingerprint = p_dedupe_fingerprint
     AND status <> 'CLOSED'
   ORDER BY created_at ASC LIMIT 1;
   IF v_ticket_id IS NULL THEN
     RAISE EXCEPTION 'could not confirm ticket persistence' USING ERRCODE = 'P0001';
   END IF;
   v_duplicate := true;
 ELSE
   INSERT INTO public.guardian_support_events(ticket_id,action_kind,actor_kind,safe_note)
   VALUES (v_ticket_id,'created','member','Authenticated support ticket created');
 END IF;
 RETURN jsonb_build_object('ticket_id',v_ticket_id,'duplicate',v_duplicate,'status',v_status);
END;
$$;
-- Functions have PUBLIC EXECUTE by default: revoke explicitly.
REVOKE ALL ON FUNCTION public.guardian_support_accept(uuid,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_support_accept(uuid,text,text,text,text)
 TO service_role;

COMMENT ON TABLE public.guardian_support_tickets IS
 'NOT DEPLOYED. Support summary may contain personal data; restricted owner read, privileged backend writes, review-governed retention.';
COMMENT ON TABLE public.guardian_support_events IS
 'NOT DEPLOYED. Internal event audit requires explicit deletion review; no browser access.';
COMMENT ON TABLE public.guardian_support_rate_windows IS
 'NOT DEPLOYED. Transactional per-owner hourly abuse counters; no user or anon access.';
COMMIT;
