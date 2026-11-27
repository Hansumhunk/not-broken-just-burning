#!/usr/bin/env bash
set -euo pipefail
# Disposable isolated runner. No linked project, remote secrets, production credentials or deploy commands.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
cd "$TMP"
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_ANON_KEY
cleanup(){ supabase stop --no-backup >"$TMP/stop.log" 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
supabase --version
supabase init --help >/dev/null
supabase start --help >/dev/null
supabase functions serve --help >/dev/null
supabase migration new --help >/dev/null
supabase init >/dev/null
supabase gen signing-key --append --algorithm ES256 >"$TMP/signing.log" 2>&1
supabase migration new isolated_advanced_fixture >/dev/null
cp "$ROOT/tests/fixtures/advanced-collection-local.sql" "$(find supabase/migrations -name '*_isolated_advanced_fixture.sql' -print -quit)"
mkdir -p supabase/functions/read-advanced-collection
cp "$ROOT/supabase/functions/read-advanced-collection/"{index.ts,core.mjs} supabase/functions/read-advanced-collection/
if ! supabase start >"$TMP/start.log" 2>&1; then echo "FAIL: disposable local stack startup; no remote retry"; exit 1; fi
supabase status -o env >"$TMP/local.env" 2>/dev/null
set -a
source "$TMP/local.env"
set +a
# Fail closed, never pass a hosted URL to a fixture request.
case "${API_URL:-}" in http://127.0.0.1:*|http://localhost:*) ;; *) echo "FAIL: non-loopback API"; exit 1;; esac
printf 'NBJB_ADVANCED_COLLECTIONS_ENABLED=true\nNBJB_ADVANCED_COLLECTIONS_PRIVATE_BUCKET=advanced-fixture-only\n' > "$TMP/functions.env"
# Gateway verification disabled ONLY in disposable fixture; exact endpoint withSupabase must verify the user JWT.
supabase functions serve read-advanced-collection --no-verify-jwt --env-file "$TMP/functions.env" >"$TMP/functions.log" 2>&1 &
SERVE=$!
trap 'kill "$SERVE" 2>/dev/null || true; cleanup' EXIT
for i in $(seq 1 40); do
  code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/functions/v1/read-advanced-collection" -H 'Content-Type: application/json' -d '{"action":"catalog"}' || true)"
  if [ "$code" = "401" ]; then break; fi
  sleep 2
done
test "$code" = "401" || { echo "FAIL: endpoint not ready or signed-out gate failed: $code"; exit 1; }
node "$ROOT/scripts/test_advanced_collection_supabase.mjs"
