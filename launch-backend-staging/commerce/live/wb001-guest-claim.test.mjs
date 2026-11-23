import test from "node:test"; import assert from "node:assert/strict";
import {signGuestClaim,verifyGuestClaim,guestReceiptLink} from "./wb001-guest-claim.mjs";
const key="a".repeat(64);
const order={id:"11111111-1111-4111-8111-111111111111",claim_nonce:"22222222-2222-4222-8222-222222222222",guest_email:"guest@example.org"};
test("guest claim signs only the exact order+nonce+email, never exposes a stored secret",async()=>{
 const claim=await signGuestClaim(order,key);
 assert.match(claim,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(await verifyGuestClaim(order,key,claim),true);
 assert.equal(await verifyGuestClaim({...order,claim_nonce:"33333333-3333-4333-8333-333333333333"},key,claim),false);
 assert.equal(await verifyGuestClaim({...order,guest_email:"another@example.org"},key,claim),false);
 assert.equal(await verifyGuestClaim(order,"b".repeat(64),claim),false);
 assert.equal(await verifyGuestClaim(order,key,"x".repeat(43)),false);
 assert.throws(()=>guestReceiptLink("https://attacker.example",order,claim),/unapproved/);
 assert.match(guestReceiptLink("https://notbrokenjustburning.com",order,claim),/#order=/);
 assert.ok(!guestReceiptLink("https://notbrokenjustburning.com",order,claim).includes(order.guest_email));
});
