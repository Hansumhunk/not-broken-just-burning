# Member support and billing runbook — November 18, 2026

The public contact inbox is the existing NBJB Gmail address. This runbook introduces no new promised SLA, live-chat feature, or clinical/legal service.

## Intake and triage
Use email subjects Account Access Support, Billing Support, Refund Request, Cancellation Feedback. Review the account email and minimal necessary facts. Prioritize unauthorized/duplicate charges, impending renewal cancellation, paid access failures, and account security. Never ask for passwords, full card details, private reflections, recovery tokens or personal case history. Refer urgent danger to Support & Safety. Confirm receipt and next step without claiming resolution.

## Refund decisions
Published policy is controlling: first monthly payment 14 calendar days; first annual payment 30 days; unintended renewal ordinarily refunded when requested within 7 days. Other cases reviewed fairly; consumer rights remain intact. Verify payment/account in Stripe, transaction date, duplicate refund/dispute status, and applicable policy. No requirement to justify dissatisfaction. Full approved refund goes to original payment method, cancels future subscription renewal, free account retained; paid access may end at processing. Do not refund or cancel merely from unverified email. Founder or authorized human approves actual financial action. Record decision and minimal transaction reference in private operational records only. Confirm Stripe refund and cancellation separately and check entitlement reconciliation; do not assume refund alone cancels renewal. Never create, store, or publish customer case records in public repository.

## Cancellation feedback
Optional separate email, with no effect on ability to cancel or receive refund. Categorize only price, time, content fit, usability, other, or declined. Do not copy narratives to analytics, and suppress small-cohort breakdowns in shared reporting. No retention-pressure offer or automatic outreach.

## Response templates
- Access: “Thanks for reaching out. Please send the page name, what you expected, and the error message without any private information. Never share your password.”
- Refund review: “We received your request. We will verify the payment and review our published policy. No card numbers are needed. This message is not confirmation of a completed refund.”
- Cancellation: “You can stop renewal via Manage Billing in Stripe. You do not need to give a reason or delete your free account. If you need assistance, we will verify the account and confirm once the cancellation is completed.”
- Feedback: “Thank you for the optional feedback. It is not required for cancellation or refund review.”

Human acceptance of real cases remains deferred; no actual payments or subscriptions changed by development.

## Standalone digital workbook support — release candidate only (004-C)

This supplements, and **does not amend**, the effective Flamewalker+ subscription cancellation/refund rules above. Boundary Builder v1.4 / Edition 004-C at **$14.99 USD** is a separate one-time purchase, initially requiring only a **free** Flamewalker account; the buyer does not need paid Flamewalker+. No buyer outreach or financial action is authorized merely by this draft.

1. **Payment not complete:** A canceled or expired Stripe Checkout session is not proof of a charge. Check the LIVE (not SANDBOX) Stripe account, exact Checkout Session/PaymentIntent state, existing commerce order and signed-webhook receipt. If unpaid, do not claim ownership or initiate a refund; explain that payment has not been confirmed. Do not reflexively send a customer back to Pay if the state is ambiguous.
2. **Charged but missing workbook:** Verify matching LIVE settled PaymentIntent/charge, exact order ID, amount/currency, matching NBJB account ID, and the correct v1.4 edition entitlement. Do not treat a screenshot or client redirect as proof. If the signed provider event has not reconciled, use the existing protected reconciliation queue and authorized technical escalation; do not grant ownership manually from an unverified email. Once legitimate ownership is confirmed, issue a fresh short-lived secure link to the private purchased ZIP, not a public or unprotected attachment.
3. **Login or recovery:** Help the verified owner recover their existing free Flamewalker account through normal account recovery; do not ask for passwords, one-time codes, private workbook content, custody details or card numbers. Account email alone is not proof of ownership.
4. **Duplicate charge:** Look for distinct LIVE PaymentIntents/charges and compare order/event ledgers. A double webhook of the same charge is not a second payment. Escalate true duplicate charges to the authorized human refund reviewer; never issue two refunds for one charge.
5. **First-edition refund request:** The **proposed, not-yet-effective** standalone policy is a full refund on a first purchase of the individual edition requested within 14 calendar days, without private narrative or nondownload proof. Effective consumer rights and provider protections always override this voluntary proposal. Human approves refunds; after an actual approved full refund, independently confirm processor refund, correct product-only entitlement treatment, buyer notification and ledger. Do not revoke unrelated workbooks or Flamewalker+ membership.
6. **Download trouble:** Confirm the correct edition and ZIP size, advise standard ZIP/PDF reader instructions and retry a short-lived link if authorized. For interrupted links, use ownership-authenticated reissuance. If an accessibility format issue is reported, offer support or a lawful remedy; do not promise an unverified accessible edition.
7. **Private record keeping:** Keep only minimal verified order references, payment state, support category, decision, and outcome in existing protected operational records. No customer details or reflection answers in public GitHub comments, analytics events or campaign lists.

### Proposed reply language (do not send automatically)

- **Payment pending:** “Thanks for checking. We are verifying the payment status before granting access or requesting another payment. Please do not purchase the same workbook again while we review it.”
- **Paid, access missing:** “We will reconcile your purchase with the payment processor and restore the correct edition's secure download if ownership is verified, or explain the appropriate remedy. You don't need to share your card number or workbook answers.”
- **Refund request:** “We received your request and will check the transaction against the applicable standalone digital-product terms and consumer rights. This is not yet confirmation that a refund was issued.”
- **Download issue:** “Please send only the page name, approximate time, your account email and the error message. Don't send passwords, full card details or personal workbook responses.”

**Release hold:** This text is a **source-only operational review candidate** until the final standalone terms, signed-payment acceptance, and founder approval are recorded. The public membership policy and existing support inbox are unchanged.
