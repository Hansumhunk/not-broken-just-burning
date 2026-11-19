-- UNAPPLIED QA PROVISIONING PAYLOAD. Never run in production.
-- Requires verified hosted project ref fgpkejlmpfkxgpktgdzm, the two
-- controlled identity inboxes and coordinated isolation under Directive 005-B.
-- Schema-only definitions; zero production records; fixtures invented.
begin;
do $$ begin
 if exists(select 1 from auth.users) or exists(select 1 from public.membership_entitlements) then
  raise exception 'QA must have zero existing users and membership rows before bootstrap; reconcile first';
 end if;
end $$;
create table public.profiles (
  user_id uuid not null,
  display_name text,
  short_bio text,
  onboarding_completed boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profiles_display_name_check CHECK (((display_name IS NULL) OR ((char_length(display_name) >= 1) AND (char_length(display_name) <= 80)))),
  constraint profiles_pkey PRIMARY KEY (user_id),
  constraint profiles_short_bio_check CHECK (((short_bio IS NULL) OR (char_length(short_bio) <= 280))),
  constraint profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.profiles to service_role;
grant select,insert,update on public.profiles to authenticated;
create policy qa_own_select on public.profiles for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_insert on public.profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy qa_own_update on public.profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.member_preferences (
  user_id uuid not null,
  profile_visibility text default 'private'::text not null,
  show_recent_work_metadata boolean default true not null,
  learning_reminders boolean default false not null,
  preferred_landing text default 'today'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint member_preferences_pkey PRIMARY KEY (user_id),
  constraint member_preferences_preferred_landing_check CHECK ((preferred_landing = ANY (ARRAY['today'::text, 'path'::text, 'library'::text]))),
  constraint member_preferences_profile_visibility_check CHECK ((profile_visibility = ANY (ARRAY['private'::text, 'members'::text]))),
  constraint member_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.member_preferences enable row level security;
revoke all on public.member_preferences from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.member_preferences to service_role;
grant select,insert,update on public.member_preferences to authenticated;
create policy qa_own_select on public.member_preferences for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_insert on public.member_preferences for insert to authenticated with check ((select auth.uid())=user_id);
create policy qa_own_update on public.member_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.member_continue_state (
  user_id uuid not null,
  next_honest_action text,
  next_honest_action_updated_at timestamp with time zone,
  last_tool_slug text,
  continue_kind text,
  continue_slug text,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint member_continue_state_continue_kind_check CHECK (((continue_kind IS NULL) OR (continue_kind = ANY (ARRAY['tool'::text, 'path'::text, 'learning'::text, 'product'::text, 'event'::text])))),
  constraint member_continue_state_continue_slug_check CHECK (((continue_slug IS NULL) OR (char_length(continue_slug) <= 160))),
  constraint member_continue_state_last_tool_slug_check CHECK (((last_tool_slug IS NULL) OR (char_length(last_tool_slug) <= 120))),
  constraint member_continue_state_next_honest_action_check CHECK (((next_honest_action IS NULL) OR (char_length(next_honest_action) <= 500))),
  constraint member_continue_state_pkey PRIMARY KEY (user_id),
  constraint member_continue_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.member_continue_state enable row level security;
revoke all on public.member_continue_state from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.member_continue_state to service_role;
grant select,insert,update on public.member_continue_state to authenticated;
create policy qa_own_select on public.member_continue_state for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_insert on public.member_continue_state for insert to authenticated with check ((select auth.uid())=user_id);
create policy qa_own_update on public.member_continue_state for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.member_path_state (
  user_id uuid not null,
  current_stage_slug text,
  current_anchor_slug text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint member_path_state_current_anchor_slug_check CHECK (((current_anchor_slug IS NULL) OR (char_length(current_anchor_slug) <= 80))),
  constraint member_path_state_current_stage_slug_check CHECK (((current_stage_slug IS NULL) OR (current_stage_slug = ANY (ARRAY['fire-reclamation'::text, 'guardian'::text, 'sacred-mirror'::text, 'masculine-restoration'::text, 'voice-of-fire'::text, 'circle-of-the-flame'::text])))),
  constraint member_path_state_pkey PRIMARY KEY (user_id),
  constraint member_path_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.member_path_state enable row level security;
revoke all on public.member_path_state from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.member_path_state to service_role;
grant select,insert,update on public.member_path_state to authenticated;
create policy qa_own_select on public.member_path_state for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_insert on public.member_path_state for insert to authenticated with check ((select auth.uid())=user_id);
create policy qa_own_update on public.member_path_state for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.member_path_progress (
  user_id uuid not null,
  stage_slug text not null,
  progress_state text default 'not_started'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint member_path_progress_pkey PRIMARY KEY (user_id, stage_slug),
  constraint member_path_progress_progress_state_check CHECK ((progress_state = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'practicing'::text]))),
  constraint member_path_progress_stage_slug_check CHECK ((stage_slug = ANY (ARRAY['fire-reclamation'::text, 'guardian'::text, 'sacred-mirror'::text, 'masculine-restoration'::text, 'voice-of-fire'::text, 'circle-of-the-flame'::text]))),
  constraint member_path_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.member_path_progress enable row level security;
revoke all on public.member_path_progress from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.member_path_progress to service_role;
grant select,insert,update on public.member_path_progress to authenticated;
create policy qa_own_select on public.member_path_progress for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_insert on public.member_path_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy qa_own_update on public.member_path_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.learning_progress (
  user_id uuid not null,
  content_kind text not null,
  content_slug text not null,
  progress_percent smallint default 0 not null,
  current_unit_slug text,
  started_at timestamp with time zone,
  last_accessed_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default now() not null,
  constraint learning_progress_content_kind_check CHECK ((content_kind = ANY (ARRAY['lesson'::text, 'track'::text, 'course'::text, 'workshop'::text, 'replay'::text]))),
  constraint learning_progress_content_slug_check CHECK (((char_length(content_slug) >= 1) AND (char_length(content_slug) <= 160))),
  constraint learning_progress_current_unit_slug_check CHECK (((current_unit_slug IS NULL) OR (char_length(current_unit_slug) <= 160))),
  constraint learning_progress_pkey PRIMARY KEY (user_id, content_kind, content_slug),
  constraint learning_progress_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100))),
  constraint learning_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
alter table public.learning_progress enable row level security;
revoke all on public.learning_progress from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.learning_progress to service_role;
grant select,insert,update on public.learning_progress to authenticated;
create policy qa_own_select on public.learning_progress for select to authenticated using ((select auth.uid())=user_id);
create policy qa_own_insert on public.learning_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy qa_own_update on public.learning_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.flamewalker_premium_lessons (
  slug text not null,
  track_slug text not null,
  lesson_number integer not null,
  title text not null,
  summary text default ''::text not null,
  content jsonb default '{}'::jsonb not null,
  status text default 'editorial_review'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint flamewalker_premium_lessons_lesson_number_check CHECK (((lesson_number >= 1) AND (lesson_number <= 999))),
  constraint flamewalker_premium_lessons_pkey PRIMARY KEY (slug),
  constraint flamewalker_premium_lessons_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  constraint flamewalker_premium_lessons_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'editorial_review'::text, 'published'::text]))),
  constraint flamewalker_premium_lessons_title_check CHECK (((length(title) >= 3) AND (length(title) <= 200))),
  constraint flamewalker_premium_lessons_track_slug_check CHECK ((track_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  constraint flamewalker_premium_lessons_track_slug_lesson_number_key UNIQUE (track_slug, lesson_number)
);
alter table public.flamewalker_premium_lessons enable row level security;
revoke all on public.flamewalker_premium_lessons from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.flamewalker_premium_lessons to service_role;
create table public.stripe_webhook_events (
  event_id text not null,
  event_type text not null,
  event_created_at timestamp with time zone not null,
  livemode boolean not null,
  user_id uuid,
  object_ref text,
  status text default 'processing'::text not null,
  error_message text,
  received_at timestamp with time zone default now() not null,
  processed_at timestamp with time zone,
  constraint stripe_webhook_events_error_message_check CHECK (((error_message IS NULL) OR (char_length(error_message) <= 1000))),
  constraint stripe_webhook_events_event_id_check CHECK (((char_length(event_id) >= 1) AND (char_length(event_id) <= 200))),
  constraint stripe_webhook_events_event_type_check CHECK (((char_length(event_type) >= 1) AND (char_length(event_type) <= 160))),
  constraint stripe_webhook_events_object_ref_check CHECK (((object_ref IS NULL) OR (char_length(object_ref) <= 200))),
  constraint stripe_webhook_events_pkey PRIMARY KEY (event_id),
  constraint stripe_webhook_events_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'processed'::text, 'ignored'::text, 'failed'::text]))),
  constraint stripe_webhook_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint qa_no_live_receipts check (livemode = false)
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.stripe_webhook_events to service_role;
-- Supported Supabase Auth signup invokes this trigger; no direct auth.users inserts.
create schema if not exists membership_qa_private;
revoke all on schema membership_qa_private from public,anon,authenticated;
create function membership_qa_private.initialize_member() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.membership_entitlements(user_id) values(new.id) on conflict(user_id) do nothing;
 insert into public.member_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function membership_qa_private.initialize_member() from public,anon,authenticated;
create trigger membership_qa_on_auth_signup after insert on auth.users
for each row execute function membership_qa_private.initialize_member();
insert into public.flamewalker_premium_lessons(slug,track_slug,lesson_number,title,summary,status,content)
select slug,track_slug,lesson_number,'QA FIXTURE: '||slug,'Fictional test-only educational placeholder.',status,
jsonb_build_object('blocks',jsonb_build_array(
 jsonb_build_object('type','heading','text','PART 1 — Fixture practice'),
 jsonb_build_object('type','paragraph','text','A fictional person writes a short plan to organize a desk. This is synthetic QA content.'),
 jsonb_build_object('type','paragraph','text','Choose one small action and test explicit save and resume. Do not enter real personal information.')
),'exercise',jsonb_build_object('title','QA reflection','prompts',jsonb_build_array('What fictional action is next?','What fictional completion marker will you use?')))
from (values
 ('father-wound','wounded-boy',1,'published'),
 ('mother-wound','wounded-boy',2,'published'),
 ('learned-silence','wounded-boy',3,'published'),
 ('bullying-shame-early-armor','wounded-boy',4,'published'),
 ('what-strength-looked-like','wounded-boy',5,'published'),
 ('allowed-to-need','wounded-boy',6,'published'),
 ('inherited-vs-chosen-manhood','wounded-boy',7,'published'),
 ('being-needed-vs-chosen','placeholder-wound',1,'published'),
 ('the-love-bargain','placeholder-wound',2,'published'),
 ('red-flags-and-responsibility','placeholder-wound',3,'published'),
 ('betrayal-rewrite-trap','placeholder-wound',4,'published'),
 ('children-not-relationship-glue','placeholder-wound',5,'published'),
 ('loyalty-without-self-abandonment','placeholder-wound',6,'published'),
 ('grieving-future-never-happened','placeholder-wound',7,'published'),
 ('other-person-not-your-measure','placeholder-wound',8,'published'),
 ('promise-of-the-room','safe-room-courtroom',1,'published'),
 ('split-alliance-therapy-triangle','safe-room-courtroom',2,'published'),
 ('professional-authority-multiplier','safe-room-courtroom',3,'published'),
 ('when-you-stop-trusting-own-account','safe-room-courtroom',4,'published'),
 ('double-bind-darvo-reaction','safe-room-courtroom',5,'published'),
 ('psychological-abuse-therapy-feedback-loop','safe-room-courtroom',6,'published'),
 ('what-comes-after-survival-adaptations','safe-room-courtroom',7,'published'),
 ('men-vulnerability-never-again-rule','safe-room-courtroom',8,'published'),
 ('document-fire-not-live-evidence-locker','safe-room-courtroom',9,'published'),
 ('when-therapy-enters-court-records','safe-room-courtroom',10,'published'),
 ('when-distress-looks-like-deception','safe-room-courtroom',11,'published'),
 ('the-credibility-cascade','safe-room-courtroom',12,'published'),
 ('challenge-bias-and-repair','safe-room-courtroom',13,'published'),
 ('rebuilding-ability-to-seek-help','safe-room-courtroom',14,'published'),
 ('body-as-ally','steadiness-command',1,'published'),
 ('name-the-emotion-choose-action','steadiness-command',2,'published'),
 ('the-space-between-trigger-and-response','steadiness-command',3,'published'),
 ('boundaries-without-cruelty','steadiness-command',4,'published'),
 ('discipline-without-self-punishment','steadiness-command',5,'published'),
 ('provision-without-proving-worth','life-rebuilt',1,'published'),
 ('fatherhood-what-children-watch','life-rebuilt',2,'published'),
 ('brotherhood-without-dependency','life-rebuilt',3,'published'),
 ('lead-yourself-first','life-rebuilt',4,'published'),
 ('the-integrated-man-thirty-day-map','life-rebuilt',5,'published'),
 ('sacred-law-emotional-boundaries','sacred-laws',1,'published'),
 ('sacred-law-pattern-recognition','sacred-laws',2,'published'),
 ('sacred-law-self-worth','sacred-laws',3,'published'),
 ('sacred-law-strategic-retreat','sacred-laws',4,'published'),
 ('sacred-law-authentic-voice','sacred-laws',5,'published'),
 ('qa-unpublished-denial-fixture','wounded-boy',999,'draft')
) as fixtures(slug,track_slug,lesson_number,status);
commit;
-- Next step only after independent approval/readback: atomic-reservation.sql
-- is applied as a distinct migration, not pasted into this transaction.
