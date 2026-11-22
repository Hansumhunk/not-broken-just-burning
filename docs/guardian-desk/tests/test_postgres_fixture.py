#!/usr/bin/env python3
"""Disposable PostgreSQL 17 synthetic Guardian Desk contract tests.

Run only in the dedicated CI Docker fixture; never connect to Supabase QA or
production. No customer data, Auth users, Stripe calls, or external emails.
"""
import concurrent.futures
import json
import pathlib
import subprocess
import sys

CONTAINER = "nbjb-guardian-postgres-fixture"
DATABASE = "guardian_fixture"
ROOT = pathlib.Path(__file__).resolve().parents[1]
DDL = ROOT / "PROPOSED_TICKET_SCHEMA.sql"
A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
CASES = 0


def query(sql, success=True):
    p = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-q", "-A", "-t",
         "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", DATABASE],
        input=sql, text=True, capture_output=True, timeout=35, check=False
    )
    if success and p.returncode != 0:
        raise AssertionError(f"SQL failed: {p.stderr[:450]}")
    if not success and p.returncode == 0:
        raise AssertionError(f"Expected SQL failure, received: {p.stdout[:300]}")
    return p.stdout.strip(), p.stderr.strip()


def check(label, condition):
    global CASES
    assert condition, label
    CASES += 1
    print("PASS", label, flush=True)


def one(sql):
    out, _ = query(sql)
    lines = [line.strip() for line in out.splitlines() if line.strip()]
    return lines[-1] if lines else ""


def intake(owner, fingerprint, summary="Synthetic lesson button does not load."):
    output = one(
        "SELECT public.guardian_support_accept("
        f"'{owner}'::uuid,'technical_problem','member-lessons',"
        f"'{summary}','{fingerprint}'"
        ");"
    )
    return json.loads(output)


def user_count(owner):
    return int(one(
        "BEGIN; SET LOCAL ROLE authenticated;"
        f"SELECT set_config('request.jwt.claim.sub','{owner}',true);"
        "SELECT count(*) FROM public.guardian_support_tickets; COMMIT;"
    ))


def rate(owner):
    return int(one(
        "SELECT accepted_count FROM public.guardian_support_rate_windows "
        f"WHERE owner_user_id='{owner}'::uuid AND "
        "window_started_at=date_trunc('hour',now());"
    ))


def main():
    ddl = DDL.read_text(encoding="utf-8")
    check("single SQL migration transaction",
          ddl.count("BEGIN;") == 1 and ddl.count("COMMIT;") == 1)
    check("three unique support tables and one RPC",
          ddl.count("CREATE TABLE public.guardian_support_") == 3
          and ddl.count("CREATE FUNCTION public.guardian_support_accept(") == 1)
    query("""
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
INSERT INTO auth.users(id)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
       ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
""")
    query(ddl)
    check("real PostgreSQL 17 accepted schema", True)
    check("RPC is service-role only, no PUBLIC/anon/authenticated EXECUTE",
          one("""SELECT
          NOT has_function_privilege('anon','public.guardian_support_accept(uuid,text,text,text,text)','EXECUTE')
          AND NOT has_function_privilege('authenticated','public.guardian_support_accept(uuid,text,text,text,text)','EXECUTE')
          AND has_function_privilege('service_role','public.guardian_support_accept(uuid,text,text,text,text)','EXECUTE');
          """) == "t")
    check("all three tables have RLS enabled",
          one("""SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'
            AND tablename LIKE 'guardian_support_%' AND rowsecurity;
          """) == "3")
    check("authenticated has own-ticket SELECT but no table writes",
          one("""SELECT has_table_privilege('authenticated','public.guardian_support_tickets','SELECT')
            AND NOT has_table_privilege('authenticated','public.guardian_support_tickets','INSERT')
            AND NOT has_table_privilege('authenticated','public.guardian_support_tickets','UPDATE')
            AND NOT has_table_privilege('authenticated','public.guardian_support_tickets','DELETE');""") == "t")

    created = intake(A, "a" * 64)
    check("first ticket stored with DB-generated UUID and NEW status",
          created["duplicate"] is False and created["status"] == "NEW"
          and len(created["ticket_id"]) == 36)
    duplicate = intake(A, "a" * 64)
    check("duplicate retry returns same ID", duplicate["duplicate"]
          and duplicate["ticket_id"] == created["ticket_id"])
    check("duplicate retry does not spend hourly ticket allowance", rate(A) == 1)

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: intake(A, "b" * 64), range(8)))
    check("eight concurrent same-owner requests link one ticket",
          len({x["ticket_id"] for x in results}) == 1
          and sum(not x["duplicate"] for x in results) == 1)
    check("concurrent duplicates charge one new-ticket slot", rate(A) == 2)

    ids_b = [intake(B, f"{i:064x}") for i in range(1, 6)]
    check("five distinct tickets accepted for second owner",
          all(not x["duplicate"] for x in ids_b) and rate(B) == 5)
    _, rate_err = query(
        f"SELECT public.guardian_support_accept('{B}'::uuid,"
        "'technical_problem','member-lessons','Synthetic sixth ticket needed',"
        f"'{6:064x}');", success=False)
    check("sixth distinct ticket is rate limited", "rate limited" in rate_err.lower())
    before = rate(B)
    retry = intake(B, f"{1:064x}")
    check("retry at quota still returns duplicate without counter increase",
          retry["duplicate"] and rate(B) == before)

    check("RLS owner A sees only two, not B tickets", user_count(A) == 2)
    check("RLS owner B sees only five, not A tickets", user_count(B) == 5)
    check("no anon read on support table",
          one("SELECT has_table_privilege('anon','public.guardian_support_tickets','SELECT');") == "f")

    # Force a real error at the audit INSERT, after the rate counter/ticket step.
    query("""ALTER TABLE public.guardian_support_events
             ADD CONSTRAINT synthetic_block_created CHECK (safe_note IS NULL) NOT VALID;""")
    prior = rate(A)
    _, err = query(
        f"SELECT public.guardian_support_accept('{A}'::uuid,'technical_problem',"
        "'member-lessons','Synthetic rollback test issue',"
        f"'{('c' * 64)}');", success=False)
    query("ALTER TABLE public.guardian_support_events DROP CONSTRAINT synthetic_block_created;")
    check("audit constraint triggers transactional SQL failure",
          "synthetic_block_created" in err)
    check("failed audit write rolled back rate window and ticket",
          rate(A) == prior and one(
              f"SELECT count(*) FROM public.guardian_support_tickets WHERE "
              f"owner_user_id='{A}' AND dedupe_fingerprint='{('c' * 64)}';"
          ) == "0")

    _, deletion = query(f"DELETE FROM auth.users WHERE id='{A}'::uuid;", success=False)
    check("unredacted account delete fails closed",
          "guardian_support_orphan_redacted" in deletion)
    query(f"""
UPDATE public.guardian_support_tickets SET
 status='CLOSED', summary='[REDACTED]',
 dedupe_fingerprint=repeat('0',64), feature_slug=NULL,
 last_verified_action=NULL, next_action=NULL, assigned_team=NULL,
 legal_hold_reference=NULL WHERE owner_user_id='{A}'::uuid;
DELETE FROM auth.users WHERE id='{A}'::uuid;
""")
    check("two closed scrubbed tickets survive only as unlinked redacted rows",
          one("""SELECT count(*) FROM public.guardian_support_tickets
          WHERE owner_user_id IS NULL AND summary='[REDACTED]'
          AND status='CLOSED' AND feature_slug IS NULL;""") == "2")
    check("rate windows for erased Auth user are removed",
          one(f"SELECT count(*) FROM public.guardian_support_rate_windows "
              f"WHERE owner_user_id='{A}'::uuid;") == "0")
    check("audit rows require safe event codes rather than customer text",
          one("""SELECT bool_and(safe_note ~ '^[a-z][a-z0-9_]{0,79}$')
          FROM public.guardian_support_events;""") == "t")
    print(f"POSTGRES_Fixture: {CASES} passed; no hosted project modified", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FAIL synthetic PostgreSQL fixture: {exc}", file=sys.stderr)
        sys.exit(1)
