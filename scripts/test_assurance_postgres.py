#!/usr/bin/env python3
"""Real two-connection PostgreSQL reference test. Disposable CI container only.
Not a hosted QA migration, membership implementation, or Stripe transaction."""
import os
import subprocess
import time

container=os.environ["NBJB_QA_POSTGRES_CONTAINER"]
base=["docker","exec","-i",container,"psql","-X","-qAt","-v","ON_ERROR_STOP=1","-U","postgres","-d","nbjb_assurance_fixture"]
def query(sql):
    return subprocess.check_output(base,input=sql,text=True,timeout=20).strip()
assert query("select current_database()")=="nbjb_assurance_fixture"
query("""
create table qa_attempts (
 owner_id text primary key,
 attempt_id text not null unique,
 offer text not null,
 phase text not null check(phase in ('creating','unknown','terminal_verified')),
 provider_key text not null unique
);
create table qa_membership (owner_id text primary key, paid_until timestamptz not null);
create table qa_products (owner_id text, slug text, primary key(owner_id,slug));
insert into qa_membership values ('synthetic-a','2026-12-02T23:03:33Z');
insert into qa_products values ('synthetic-a','fixture-only');
""")
lock=482394643
first=subprocess.Popen(base+["-c",f"""begin;
select pg_advisory_xact_lock({lock});
insert into qa_attempts values ('synthetic-a','attempt-a','monthly','creating','nbjb-fixture-attempt-a') on conflict(owner_id) do nothing;
select pg_sleep(5); commit;"""],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
    deadline=time.monotonic()+3.5
    while time.monotonic()<deadline:
        if query(f"select not pg_try_advisory_xact_lock({lock})")=="t": break
        time.sleep(.05)
    else: raise AssertionError("Could not prove holder is concurrently active")
    # The second process overlaps first transaction, not just sequential calls.
    start=time.monotonic()
    claim=query("""insert into qa_attempts values ('synthetic-a','attempt-b','annual','creating','nbjb-fixture-attempt-b')
    on conflict(owner_id) do nothing returning attempt_id;""")
    elapsed=time.monotonic()-start
    out,err=first.communicate(timeout=15)
    assert first.returncode==0, "first transaction failed"
    assert claim=="", "second simultaneous contender must not create a reservation"
    assert elapsed>0.5, "expected wait on concurrent uniqueness enforcement"
    assert query("select count(*) from qa_attempts")== "1"
    assert query("select attempt_id||':'||provider_key from qa_attempts")=="attempt-a:nbjb-fixture-attempt-a"
    print("PostgreSQL two sessions overlapped; one unique reservation across monthly/annual contenders PASS")
finally:
    if first.poll() is None: first.kill(); first.wait()
query("update qa_attempts set phase='unknown' where attempt_id='attempt-a'")
assert query("insert into qa_attempts values ('synthetic-a','later-window','annual','creating','new-key') on conflict(owner_id) do nothing returning attempt_id")==""
assert query("select provider_key from qa_attempts")=="nbjb-fixture-attempt-a"
assert query("update qa_attempts set phase='terminal_verified' where attempt_id='wrong' and phase='unknown' returning attempt_id")==""
assert query("update qa_attempts set phase='terminal_verified' where attempt_id='attempt-a' and phase='unknown' returning attempt_id")=="attempt-a"
print("Unknown result holds persistent original key; stale CAS rejected PASS")
assert query("select paid_until>'2026-12-02T23:03:32.999Z'::timestamptz from qa_membership")=="t"
assert query("select paid_until>'2026-12-02T23:03:33Z'::timestamptz from qa_membership")=="f"
query("update qa_membership set paid_until='2026-12-02T23:03:33Z' where owner_id='synthetic-a'")
assert query("select count(*) from qa_products where owner_id='synthetic-a'")== "1"
print("Finite paid-through boundary and independent product reference row PASS")
print("Reference database only; actual hosted candidate acceptance still required")
