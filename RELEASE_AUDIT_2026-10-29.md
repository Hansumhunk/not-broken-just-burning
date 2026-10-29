# NBJB Production Recovery Audit — October 29, 2026

## Confirmed from connected services

- The public site deployed successfully from `main` on October 9, 2026.
- Flamewalker Free account support merged in PR #77 on October 5.
- Member navigation and Coming Soon states merged in PR #82.
- Search-entry guidance updates merged in PRs #83 and #84.
- Supabase project `NBJB Phase Two` was `INACTIVE` on October 29. A restore request succeeded and the immediately observed status was `COMING_UP`.
- These findings do not establish that member sign-in is currently healthy.

## Recovery acceptance criteria

- [ ] Confirm Supabase project status is `ACTIVE_HEALTHY`.
- [ ] Run `scripts/validate_supabase_runtime.py` against production.
- [ ] Check production Auth Site URL and allowed redirect targets.
- [ ] Test signup, email verification, login, logout, password recovery, and first-run onboarding in a browser.
- [ ] Verify free-member entitlements and cross-account access restrictions.
- [ ] Review Supabase Security Advisor after the backend is healthy.
- [ ] Confirm reflections stay device-local by default, and confirm Clear This Device behavior.
- [ ] Test member mobile navigation, Library's live Start Here lesson, and Coming Soon controls.
- [ ] Confirm public GitHub Pages DNS, HTTPS, and Google Search Console indexing.

## Backlog triage

- PR #79 is conflicted and overlaps PR #82. Reconcile remaining changes before closing it; do not merge blindly.
- PR #8 remains a draft Forge Analysis release with pending hands-on QA and merge conflicts.
- PR #4 remains the development-only member platform baseline.
- PR #63 remains a development-only billing bridge. Do not merge into production before sandbox payment QA.

## Privacy and deployment rules

Never ship unpublished books, personal journals, legal records, or private reflection content from the project to public GitHub Pages. No Stripe live checkout until paid access and cancellation tests pass. Public content must preserve the non-clinical, non-legal educational scope of NBJB.

## Documentation debt

`README.md` and `SUPABASE_PRODUCTION_AUTH.md` still describe some pre-release states. Update them after current hosted Auth checks; do not mistake old text for current runtime evidence.
