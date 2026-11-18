# Flame Letter website integration
This repository contains only public website source and generic release safeguards. Campaign copy and private operating materials are maintained outside the public repository.
- Signup is deliberately disabled in `js/flame-letter.js`; do not set either gate true before verified Brevo setup, founder approval, final privacy review and controlled end-to-end tests.
- Only a verified HTTPS Brevo hosted `sibforms.com/serve/` link is supported. Never place API credentials, confirmation tokens, email addresses, or private data in repository source.
- The provider owns subscriber confirmation, suppression and unsubscribe. The website preferences page is informational; it does not perform or verify a subscription action.
- Upon approved release, revise Coming Soon copy, privacy notice, metadata and signup gates together. No member or billing changes are required.
- Automated tests: `node --test scripts/test_flame_letter.js`; browser regression: `python tests/flame_letter_browser_test.py` with Chromium installed.
- Track final acceptance in issue #1 and PR #230. The intent event is not a verified subscription; provider-side aggregate confirmed counts are separate.
