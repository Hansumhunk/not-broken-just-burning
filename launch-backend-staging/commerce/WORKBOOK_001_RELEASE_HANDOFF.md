# From Chaos to Clarity — Store integration handoff (NBJB-WB-001)
**Stage:** founder manuscript direction and $17.99 retail approved; $9.99 Flamewalker+ discount is the proposed stronger member rate. **Not published. No production charge or deployment authorized by this branch.**

## Existing infrastructure — reuse it
- Build on the staged native Store / owned Library in draft PR #242 and the hard-locked production adapter in draft PR #264. Integration PR #265 is explicitly **DO NOT MERGE**.
- Production `commerce_products` currently has five inactive SKUs; `nbjb-private-products` exists as a private storage bucket, but no completed workbook customer files are uploaded.
- The deployed `commerce-live` worker's source has `LIVE_RUNTIME_REVIEWED=false` and a fixed SKU map. Do not change that flag or permit checkout here.
- Commerce QA issue #214 restricts new standalone sales until customer/entitlement source-of-truth checks are resolved. Provider acceptance #249 is distinct.

## Exact product and file boundary
- Product: **NBJB-WB-001**, slug `from-chaos-to-clarity`, first edition, 44-page digital PDF and 44-page print-friendly PDF, customer ZIP. The editable DOCX master is **not** customer-deliverable.
- Founder-approved regular price: **USD 17.99 (1799 cents)**, one time.
- Proposed verified active Flamewalker+ price: **USD 9.99 (999 cents)**, USD 8.00 / approximately **44.5%** off. This amount still needs exact founder acceptance; do not advertise it as active.
- Customer ZIP expected SHA-256: `e5194f3fbe0e863fd467c9f0e130c6e5ba70754677a2e1828bc5c5fbb9357f87`.
- Candidate immutable private key: `from-chaos-to-clarity/v1.0/NBJB-WB-001_v1.0_customer.zip` inside existing `nbjb-private-products` bucket. No consumer file is stored in public Git.
- Public sample: seven-page `NBJB-WB-001_Free_Sample.pdf`, plus approved store cover art. Publish sample and artwork through a suitable authorized public asset channel only after validating content and rights.

## Required engineering before release
1. **Guest checkout without forced membership.** Founder's directive says no account requirement merely to purchase an individual workbook. Current commerce worker requires an authenticated member. Design a secure independent guest purchase with verified email receipt and narrowly scoped redemption token or equivalent, replay-safe and resistant to cross-customer claims. My Library linking, if later chosen, must be optional and verified; no full public PDF URLs.
2. **Correct member discount server-side.** Separate immutable one-time Stripe Price IDs for regular and member prices, same reviewed live product/tax treatment. At checkout verify current paid entitlement and expiry from the trusted backend; browser-displayed price or a supplied Boolean must never select the discount. Reject expired/canceled paid-through access when no longer eligible. Membership remains separate from owning a workbook.
3. **Production asset binding.** Hash-check and upload the buyer-only ZIP to the existing private product bucket with versioned path. Verify path, bytes and access; only approved paid guest or account order may receive a short-lived signed URL. Verify ownership after redirects and revoke/suspend on verified refunds or disputes in line with policy.
4. **Tax, terms and refunds.** Decide exact member price, correct digital educational product tax classification and registrations, final personal-use license, refund disclosure and delivery/support terms. Existing membership refund copy must not substitute automatically.
5. **QA.** Exercise 1799 vs 999 selection, non-member guest, Free account, active paid member, canceled/expired paid member, price manipulation, duplicate/replayed events, failed/expired payments, full/partial refund, foreign account access, guest token reuse and expiry, mobile download, Library ownership, and rollback. Provider signed sandbox acceptance must be documented independently, then an explicitly authorized one-SKU live paid canary.
6. **No simultaneous blanket activation.** Do not set `LIVE_RUNTIME_REVIEWED`, `NBJB_COMMERCE_LIVE_CHECKOUT`, a production product row `active=true`, or any new price to customer-facing sale without written release decision and accepted tests. Existing live recurring Flamewalker+ service is untouched.

## Work staged in this branch
- Browser catalog item with retail and proposed member rate clearly separated.
- Disabled Store product card with authentic finished-product scope and no false purchase button.
- Non-sensitive SKU record and review gates. These are prelaunch changes only.

**Release readiness:** manuscript manufactured; Store presentation staged; commercial guest/payment/security acceptance **blocked**.
