#!/usr/bin/env python3
"""Run actual staged membership DDL against disposable PostgreSQL. No hosted DB."""
import os, subprocess, time, pathlib
container=os.environ["NBJB_QA_POSTGRES_CONTAINER"]
base=["docker","exec","-i",container,"psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","postgres","-d","nbjb_membership_fixture"]
def q(sql):
    return subprocess.check_output(base,input=sql,text=True,timeout=25).strip()
assert q("select current_database()")=="nbjb_membership_fixture"
q("""create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create table public.membership_entitlements(user_id uuid primary key references auth.users(id), provider text, tier text not null, valid_from timestamptz not null default now(), valid_until timestamptz);
insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.membership_entitlements(user_id,tier) values ('00000000-0000-4000-8000-000000000001','free_member');
grant select,update on public.membership_entitlements to service_role;""")
q(pathlib.Path("launch-backend-staging/membership-atomic/atomic-reservation.sql").read_text())
u="00000000-0000-4000-8000-000000000001"
a="00000000-0000-4000-8000-000000000011"
b="00000000-0000-4000-8000-000000000012"
def claim(attempt,offer):
    return f"select attempt_id::text||':'||offer from public.claim_membership_checkout('{u}','{attempt}','flamewalker_plus_{offer}','cus_fixture','{{}}'::jsonb)"
first=subprocess.Popen(base+["-c",f"begin; set local role service_role; {claim(a,'monthly')}; select pg_sleep(4); commit;"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
    deadline=time.monotonic()+3
    while time.monotonic()<deadline:
        if q("select count(*) from pg_stat_activity where wait_event='PgSleep'")=="1": break
        time.sleep(.05)
    else: raise AssertionError("first transaction not demonstrably overlapping")
    start=time.monotonic()
    assert q("set role service_role; "+claim(b,"annual"))==a+":flamewalker_plus_monthly"
    assert time.monotonic()-start>0.5
    out,err=first.communicate(timeout=15)
    assert first.returncode==0,err
finally:
    if first.poll() is None: first.kill(); first.wait()
assert q("select count(*) from public.membership_checkout_attempts")=="1"
assert q("set role service_role; "+claim(b,"annual"))==a+":flamewalker_plus_monthly"
assert q("select provider_key from public.membership_checkout_attempts")=="nbjb-membership-"+a
assert q("select has_table_privilege('authenticated','public.membership_checkout_attempts','select')")=="f"
assert q("select has_function_privilege('authenticated','public.claim_membership_checkout(uuid,uuid,text,text,jsonb)','execute')")=="f"
assert q("select has_column_privilege('service_role','public.membership_checkout_attempts','request_body','update')")=="f"
assert q("set role service_role; update public.membership_checkout_attempts set session_ref='cs_fixture' where attempt_id='"+b+"' and session_ref is null returning attempt_id")==""
assert q("set role service_role; update public.membership_checkout_attempts set session_ref='cs_fixture' where attempt_id='"+a+"' and session_ref is null returning attempt_id")==a
assert q("set role service_role; update public.membership_checkout_attempts set released_at=now() where attempt_id='"+a+"' and session_ref='cs_fixture' and released_at is null returning attempt_id")==a
assert q("set role service_role; "+claim(b,"annual"))==b+":flamewalker_plus_annual"
assert q("select count(*) from public.membership_checkout_attempts where released_at is null")=="1"
assert q(f"select membership_revision from public.membership_entitlements where user_id='{u}'")=="0"
assert q(f"set role service_role; update public.membership_entitlements set tier='free_member' where user_id='{u}' and membership_revision=0 returning membership_revision")=="1"
assert q(f"set role service_role; update public.membership_entitlements set tier='paid_member' where user_id='{u}' and membership_revision=0 returning membership_revision")==""
assert q("select count(*) from pg_constraint where conname='membership_stripe_finite_period'")=="1"
print("Actual staged reservation DDL: overlapping two-connection monthly/annual claim, immutable payload ACL, stale CAS, release and revision fence PASS")
