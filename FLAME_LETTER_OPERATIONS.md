# Flame Letter website integration
This repository contains only public website source and generic release safeguards. Campaign copy and private operating materials are maintained outside the public repository.
- Signup is deliberately disabled in `js/flame-letter.js`; do not set either gate true before verified Brevo setup, founder approval, final privacy review and controlled end-to-end tests.
- Only a verified HTTPS Brevo hosted `sibforms.com/serve/` link is supported. Never place API credentials, confirmation tokens, email addresses, or private data in repository source.
- The provider owns subscriber confirmation, suppression and unsubscribe. The website preferences page is informational; it does not perform or verify a subscription action.
- Upon approved release, revise Coming Soon copy, privacy notice, metadata and signup gates together. No member or billing changes are required.
- Automated tests: `node --test scripts/test_flame_letter.js`; browser regression: `python tests/flame_letter_browser_test.py` with Chromium installed.
- Track final acceptance in issue #1 and PR #230. The intent event is not a verified subscription; provider-side aggregate confirmed counts are separate.

## Release and emergency rollback
- All three public gates (enabled, privacyReviewed, founderApproved) stay false until explicit command authorization. Verify the actual owned hosted URL; URL syntax is not ownership verification.
- Stage a provider test list/form and disarmed production workflow; use approved controlled test addresses only. At release update privacy, copy, metadata, config and cache version in one reviewed change. Rerun static and dedicated browser/guard CI; reconcile latest main; get approval before merge/deploy.
- Emergency stop: cancel scheduled broadcasts and deactivate marketing automations (pause alone may let existing contacts continue); verify zero active contacts/queued sends and stop hosted form enrollment. Preserve suppression and consent evidence, leave essential account and purchase mail alone. Disable all three website gates, clear hosted URL, bump script version and publish only after appropriate emergency authorization. Verify public link absent in a fresh browser; no full-branch revert that would undo parallel work. Record incident and require new approval and pilot before resuming.
- CI covers generic template changes, shared privacy/analytics and entry pages; no credentials or populated campaigns in the public repository. No send, merge or deployment authorized by this change.
