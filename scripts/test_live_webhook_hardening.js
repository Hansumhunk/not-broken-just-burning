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
const leaseSource = fs.readFileSync(path.join(__dirname, '..', 'launch-backend-staging', 'stripe-live-webhook', 'receipt-lease.mjs'), 'utf8');
test('never acknowledge an unfinished duplicate as processed', () => {
  assert.match(leaseSource, /\["processed", "ignored"\]\.includes\(existing\.status\)/);
  assert.match(webhook, /claim\.kind === "terminal"/);
  assert.match(webhook, /claim\.kind === "retry"/);
  assert.match(webhook, /event_still_processing/);
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


const { pathToFileURL } = require('node:url');
const moduleUrl = pathToFileURL(path.join(__dirname, '..', 'launch-backend-staging', 'stripe-live-webhook', 'receipt-lease.mjs')).href;
const NOW = Date.parse('2026-11-18T14:00:00Z');
const EVENT = { id:'evt_fake', type:'invoice.paid', created:NOW/1000, livemode:true, data:{object:{id:'in_fake'}} };
const row = (status, age) => ({event_id:EVENT.id, status, livemode:true, received_at:new Date(NOW-age).toISOString()});
// Model atomic conditional updates and unique insertion; the real source is imported.
function store(initial, opts={}) {
  let current=initial && {...initial}, writes=0;
  return {
    get row(){return current;}, get writes(){return writes;},
    select(){return query('read');},
    update(patch){return query('update',patch);},
    async insert(value){if(opts.insertCollision || current) return {error:{code:'23505'}};current={...value};writes++;return {error:null};}
  };
  function query(kind,patch){
    const filters=[];
    return {eq(k,v){filters.push([k,v]);return this;},select(){return this;},async maybeSingle(){
      if(kind==='read'){
        const snapshot=current && {...current};
        if(opts.afterRead) opts.afterRead();
        return {data:snapshot,error:opts.readError?{message:'db'}:null};
      }
      if(!current||!filters.every(([k,v])=>current[k]===v))return {data:null,error:null};
      current={...current,...patch};writes++;return {data:{event_id:current.event_id},error:null};
    }};
  }
}
test('receipt insert uniqueness collision and fresh processing both require retry', async()=>{
  const {claimReceipt}=await import(moduleUrl);
  for(const db of [store(null,{insertCollision:true}),store(row('processing',1000))]){
    assert.equal((await claimReceipt(db,EVENT,NOW)).kind,'retry');
    assert.equal(db.writes,0);
  }
});
test('new receipt is claimed; terminal receipt is acknowledged without mutation',async()=>{
  const {claimReceipt}=await import(moduleUrl);
  const db=store(null);
  const first=await claimReceipt(db,EVENT,NOW);
  assert.equal(first.kind,'claimed');
  assert.equal(db.row.received_at,first.lease);
  const terminal=store(row('processed',3600000));
  assert.equal((await claimReceipt(terminal,EVENT,NOW)).kind,'terminal');
  assert.equal(terminal.writes,0);
});
test('stale and failed receipt attempts are reclaimed exactly once by compare and swap',async()=>{
  const {claimReceipt,RECEIPT_LEASE_MS}=await import(moduleUrl);
  for(const status of ['processing','failed']){
    const db=store(row(status,RECEIPT_LEASE_MS+1000));
    const claims=await Promise.all([claimReceipt(db,EVENT,NOW),claimReceipt(db,EVENT,NOW+1)]);
    assert.deepEqual(claims.map(x=>x.kind).sort(),['claimed','retry']);
    assert.equal(db.writes,1);
  }
});
test('failed read, invalid receipt time and non-live event fail closed',async()=>{
  const {claimReceipt}=await import(moduleUrl);
  assert.equal((await claimReceipt(store(null,{readError:true}),EVENT,NOW)).kind,'error');
  assert.equal((await claimReceipt(store({...row('processing',0),received_at:'invalid'}),EVENT,NOW)).kind,'error');
  assert.equal((await claimReceipt(store(null),{...EVENT,livemode:false},NOW)).kind,'error');
});
test('terminal writes are fenced by the current receipt lease',()=>{
  assert.match(webhook,/\.eq\("status", "processing"\)\s*\.eq\("received_at", receiptLease\)\s*\.select\("event_id"\)/);
  assert.match(webhook,/if \(!finished\) return json\(\{ error: "receipt_lease_lost" \}, 503\)/);
  assert.equal((webhook.match(/\.eq\("received_at", receiptLease\)/g)||[]).length,2);
});
