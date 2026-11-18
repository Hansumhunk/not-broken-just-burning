'use strict';
// Regression gates for the version-controlled live webhook candidate.
// These are structural assertions; live delivery and browser tests remain separate gates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const webhook = fs.readFileSync(path.join(__dirname, '..', 'launch-backend-staging', 'stripe-live-webhook', 'index.ts'), 'utf8');
test('reject unsigned webhook calls', () => {
  assert.match(webhook, /stripe\.webhooks\.constructEventAsync\(rawBody, signature, webhookSecret\)/);
  assert.match(webhook, /missing_signature/);
  assert.match(webhook, /invalid_signature/);
});
test('never acknowledge an unfinished duplicate as processed', () => {
  assert.match(webhook, /\["processed", "ignored"\]\.includes\(existing\.status\)/);
  assert.match(webhook, /existing\?\.status === "processing"/);
  assert.match(webhook, /event_still_processing/);
  assert.doesNotMatch(webhook, /\["processed", "ignored", "processing"\]/);
});
test('only grant paid entitlement after payment and handle async completion', () => {
  assert.match(webhook, /case "checkout\.session\.completed":/);
  assert.match(webhook, /case "checkout\.session\.async_payment_succeeded":/);
  assert.match(webhook, /session\.payment_status !== "paid"/);
  assert.ok(webhook.indexOf('session.payment_status !== "paid"') < webhook.indexOf('syncSubscription(subscriptionId, session.client_reference_id)'), 'payment gate precedes access update');
});
test('preserves separation from sandbox and signed entitlement sync', () => {
  assert.match(webhook, /if \(!event\.livemode\)/);
  assert.match(webhook, /NBJB_SANDBOX_TEST_USER_ID/);
  assert.match(webhook, /from\("membership_entitlements"\)/);
  assert.match(webhook, /provider_subscription_ref: subscription\.id/);
});

test('receipt insert uniqueness collision must be retryable, not successful', () => {
  assert.match(webhook, /if \(insertError\.code === "23505"\) return json\(\{ error: "event_still_processing" \}, 503\)/);
  assert.doesNotMatch(webhook, /if \(insertError\.code === "23505"\) return json\(\{ received: true/);
});
