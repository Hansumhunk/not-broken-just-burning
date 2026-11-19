# H.A.W.K. release acceptance record

Scope: Men's Divorce Recovery Center and ten version-one offline applications. PR #227 merged November 17, 2026 as a founder-approved controlled initial release (merge 9b2104b271e1daea7f82624e56cf5038b145a0c2). The November 19 readiness audit proposes follow-up repairs only; no further deployment or paid-access changes authorized.

## Verified engineering evidence

- All ten teaching bodies: 39,206 independently counted words, 170 sections, 30 fictional worked scenarios, ten exercises. All ten guides exceed 3,000 words. All 170 section links resolve; all ten guide canonical URLs, unique titles, download paths and landing-page links checked. Directory and direct dashboard entry added.
- Static-site validation #753 succeeded on feature commit ae72aee4ccfb6c81e4dabcab756b3a4166fb9fb4.
- Browser regression #4 (run 44191843195, job 134423148101, feature commit 9d149c3d6c1eab51a0e51997fa969716c98e3d26) passed all ten tools in real headless Chromium 134. Fictional data only. At widths 360/768/1280 CSS pixels, checked horizontal overflow, labels, duplicate IDs and keyboard focus entry. Created records in original standalone editors, downloaded actual JSON, cleared and reopened files, preserved stable IDs, verified reference forget/clear races. Exercised dashboard selected/sensitive exports, permission enforcement, actual PDF rendering, and exported each module back into its original editor.
- The first browser workflow failed before application tests because ubuntu-latest moved to 26.04. Runner pinned to Ubuntu 24.04. Second workflow caught duplicate status IDs in Evidence Index and Documentation Checklist; fixed both; the full browser suite subsequently passed. The failures are retained as evidence rather than hidden.
- Nine standalone tools now invalidate asynchronous imports on clear/newer import/forget; clear always available, including when no saved records exist. Dashboard clear cancels pending imports, including when no module has yet loaded. User data never appears in logs/test fixtures.
- Static source inspection across ten applications: valid JS syntax, no duplicate static IDs, restrictive CSP with connect-src none, no remote script/style/image/iframe dependencies, no direct storage/network API calls, and no direct HTML injection sinks in scripts. This is not a comprehensive security assessment.
- Additional regression coverage added for dashboard pending-import cancellation, inert imported markup in dashboard and checklist, and axe automated accessibility scanning. See latest workflow results; do not treat a running/failed test as passing.

## Reproducibility

Run `python -m pip install playwright==1.51.0`, `python -m playwright install chromium`, then `python tests/hawk_browser_test.py`. CI uses Ubuntu 24.04, Python 3.12, pinned Playwright, pinned axe-core 4.10.3 and read-only checkout. All browser requests to HTTP(S) destinations are blocked during the offline test. CI tests fixture data only. The browser downloads the application's JSON and renders PDF under actual browser behavior. No personal records should ever be supplied to CI.

## November 19 operational readiness audit

Baseline main: `87f89d0f2d83e8a21f5c12c3713c7a1749f9c76a`. Static validation #883 and Pages build #250 succeeded on this baseline. Historical final PR #227 Chromium + axe regression runs #8 (44192462457) and #9 (44197030717) completed successfully; #9 job 134441052786 confirms the accessibility dependency and browser test steps succeeded. Existing source checks and prior CI are evidence, not a fresh live-device test.

All ten implemented; none require rebuilding. Timeline, evidence, checklist, preparation, parenting, financial and witness editors failed to classify a dropdown-only draft as unsubmitted work. Corrected their form-change predicate to recognize non-default select values while preserving existing nonblank text checks. Support already guarded selection-only drafts. Added browser regression for all eight record editors, financial arithmetic/unknown/invalid/atomic-import cases and communication safety gates. New tests require candidate CI; not yet represented as passing.

The center download directory now explicitly warns about session loss and unencrypted exports before users choose a tool. All ten downloadable source files on baseline have connect-src none and no direct browser storage/network API calls in inspected scripts. Public guide pages may load ordinary site analytics; offline tools do not. Existing browser export/import and PDF checks must not be mistaken for actual iOS/Android file handling or independent editorial, legal, clinical or security certification.

Production URL retrieval was unavailable to this audit environment; successful GitHub Pages deployment is indirect evidence, not direct HTTP or live navigation verification. No personal records were used.

## Open release gates (follow-up acceptance for the deployed V1)

- Latest expanded automated browser and accessibility run must pass on the final application code.
- Test the public recovery center and guide-to-download navigation at production-like origin; ensure guide and offline asset titles, responsive layout, direct download and session warnings are clear.
- Manual screen-reader navigation, keyboard-only complete operation, focus order, contrast and zoom; axe and label tests alone do not certify accessibility.
- Actual Android/iOS local-file import/download/print workflows and another desktop engine. Responsive Chromium widths are not device or OS compatibility.
- Verify no analytics or user record transmission from offline tools; review privacy policy, browser downloads and sync risks, explicit unencrypted-export warnings, and broader security assumptions. Offline tools are not a secure evidence vault; no legal admissibility or privilege guarantee.
- Final editorial review of all 39,206 words: educational clarity, working exercises, source fidelity to the constructive H.A.W.K. framework, professional-role boundaries, child-centered language, and current crisis-resource guidance. Keyword and structural checks are not full subject-matter review. Preserve the archived original manuscript; do not publish its original adversarial title or unrevised contents as a paid product.
- Re-review PR diff against current main, verify all required checks and no deployment side effects, then request explicit release approval. If deployment occurs later, verify public content and downloads with fictional data only; rollback by reverting the release commit if necessary.

Controlled V1 is already released. Withhold any new merge/deployment and broader readiness claims until the candidate tests and remaining acceptance gates are resolved. No claim of legal, clinical or financial advice, WCAG certification, security audit certification, or guaranteed browser compatibility.
