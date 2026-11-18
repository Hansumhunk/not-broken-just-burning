const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {CONFIG, approvedSignupUrl, captureSignupIntent, renderSignup} = require('../js/flame-letter.js');
const valid = {enabled:true, privacyReviewed:true, founderApproved:true, hostedFormUrl:'https://test.sibforms.com/serve/example-not-a-real-form'};
test('production defaults collect nothing; all release gates required', () => {
  assert.equal(approvedSignupUrl(CONFIG),null);
  assert.equal(approvedSignupUrl({...valid,enabled:false}),null);
  assert.equal(approvedSignupUrl({...valid,privacyReviewed:false}),null);
  assert.equal(approvedSignupUrl({...valid,founderApproved:false}),null);
  assert.equal(approvedSignupUrl({...valid,hostedFormUrl:''}),null);
});
test('only a clean HTTPS provider form URL can pass', () => {
  assert.equal(approvedSignupUrl(valid),valid.hostedFormUrl);
  for (const hostedFormUrl of ['javascript:alert(1)','http://test.sibforms.com/serve/x','https://sibforms.com.evil.test/serve/x','https://evil.test/serve/x','https://user@sibforms.com/serve/x','https://sibforms.com:444/serve/x','https://sibforms.com/serve/','https://sibforms.com/other','https://sibforms.com/serve/x?email=test','https://sibforms.com/serve/x#token','not a url'])
    assert.equal(approvedSignupUrl({...valid,hostedFormUrl}),null,hostedFormUrl);
});
test('signup intent is production-only, privacy-gated and contains no identity', () => {
  const events=[]; const env={location:{hostname:'notbrokenjustburning.com'},navigator:{},posthog:{capture:(...args)=>events.push(args)}};
  captureSignupIntent(env);
  captureSignupIntent({...env,navigator:{globalPrivacyControl:true}});
  captureSignupIntent({...env,navigator:{doNotTrack:'1'}});
  captureSignupIntent({...env,doNotTrack:'1'});
  captureSignupIntent({...env,location:{hostname:'localhost'}});
  captureSignupIntent({...env,posthog:{capture:()=>{throw Error('offline')}}});
  assert.deepEqual(events,[['nbjb_flame_letter_signup_intent',{placement:'landing_page'}]]);
});
test('disabled render does not create an anchor or make a network request', () => {
  const doc={querySelector:()=>({}),createElement:()=>{throw Error('must not create')}};
  assert.equal(renderSignup(CONFIG,doc,{}),false);
});
test('synthetic enabled render produces native keyboard-accessible anchor, no form', () => {
  const container={replaceChildren(x){this.child=x}};
  const nodes={'[data-flame-letter-signup]':container,'[data-flame-letter-status]':{},'[data-flame-letter-stage]':{},'[data-flame-letter-provider-note]':{}};
  const doc={querySelector:s=>nodes[s],createElement:tag=>({tag,addEventListener(){}})};
  assert.equal(renderSignup(valid,doc,{}),true);
  assert.equal(container.child.tag,'a');assert.equal(container.child.href,valid.hostedFormUrl);
  assert.equal(container.child.referrerPolicy,'no-referrer');
  assert.match(nodes['[data-flame-letter-status]'].textContent,/Confirm/);
});
test('public pages have no form, email field or provider iframe while gated', () => {
  for (const path of ['flame-letter.html','flame-letter-preferences.html']){
    const html=fs.readFileSync(path,'utf8');
    assert.doesNotMatch(html,/<form\b|<iframe\b|type=["']email["']/i);
    assert.match(html,/<main\b/);assert.match(html,/privacy\.html/);
  }
  for(const path of ['index.html','join.html','resources.html','privacy.html'])assert.match(fs.readFileSync(path,'utf8'),/flame-letter(?:-preferences)?\.html/);
});

test('seven generic template pairs only, no populated campaign archive',()=>{const path='.github/flame-letter/templates';const names=fs.readdirSync(path);assert.equal(names.filter(x=>x.endsWith('.html.txt')).length,7);assert.equal(names.filter(x=>x.endsWith('.plain.txt')).length,7);for(const name of names.filter(x=>x.endsWith('.txt'))){const s=fs.readFileSync(path+'/'+name,'utf8');assert.match(s,/\{\{ unsubscribe \}\}/);assert.match(s,/\[\[REPLACE_WITH_VERIFIED_BUSINESS_MAILING_ADDRESS\]\]/);assert.match(s,/privacy\.html/);assert.doesNotMatch(s,/\bsk_live_|\bxkeysib-/);}});
