#!/usr/bin/env python3
"""Disposable bootstrap smoke test, not hosted Auth/provider acceptance."""
import os, pathlib, subprocess
c=os.environ["NBJB_QA_PG"]
base=["docker","exec","-i",c,"psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","postgres","-d","nbjb_005b_fixture"]
def q(sql):
    return subprocess.check_output(base,input=sql,text=True,timeout=25).strip()
assert q("select current_database()")=="nbjb_005b_fixture"
q("""
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,service_role;
create table public.membership_entitlements(user_id uuid primary key references auth.users(id) on delete cascade, provider text,tier text not null default 'free_member',status text not null default 'active',valid_from timestamptz not null default now(),valid_until timestamptz);
alter table public.membership_entitlements enable row level security;
grant select on public.membership_entitlements to authenticated;
grant select,insert,update on public.membership_entitlements to service_role;
create policy own_membership on public.membership_entitlements for select to authenticated using ((select auth.uid())=user_id);
""")
root=pathlib.Path("launch-backend-staging/membership-atomic")
q((root/"qa-bootstrap-005b.sql").read_text())
q((root/"atomic-reservation.sql").read_text())
assert q("select count(*) from public.flamewalker_premium_lessons where status='published'")=="44"
assert q("select count(*) from public.flamewalker_premium_lessons where status='draft'")=="1"
assert q("select count(*) from pg_class where relnamespace='public'::regnamespace and relname in ('profiles','member_preferences','member_continue_state','member_path_state','member_path_progress','learning_progress','flamewalker_premium_lessons','stripe_webhook_events','membership_checkout_attempts') and relrowsecurity")=="9"
# Direct inserts ONLY into local fake auth table, never hosted Auth.
a="00000000-0000-4000-8000-000000000001";b="00000000-0000-4000-8000-000000000002"
q(f"insert into auth.users values ('{a}'),('{b}')")
assert q("select count(*) from public.profiles")=="2"
assert q("select count(*) from public.membership_entitlements where tier='free_member'")=="2"
assert q("select count(*) from public.member_preferences")=="2"
def identity(id):return f"set role authenticated; set request.jwt.claim.sub='{id}';"
assert q(identity(a)+"select count(*) from public.profiles")=="1"
assert q(identity(a)+f"update public.profiles set display_name='fixture A' where user_id='{b}' returning user_id")==""
assert q(identity(a)+f"update public.profiles set display_name='fixture A' where user_id='{a}' returning user_id")==a
assert q(identity(b)+f"select count(*) from public.profiles where user_id='{a}'")=="0"
assert q("select has_table_privilege('authenticated','public.flamewalker_premium_lessons','select')")=="f"
assert q("select has_table_privilege('authenticated','public.stripe_webhook_events','select')")=="f"
assert q("select has_table_privilege('authenticated','public.membership_entitlements','update')")=="f"
assert q("select has_function_privilege('authenticated','membership_qa_private.initialize_member()','execute')")=="f"
print("Bootstrap SQL + actual atomic candidate DDL PASS: 44 published + 1 draft fixture; two synthetic trigger initialized users; RLS owner isolation and server-only manuscript/receipts")
