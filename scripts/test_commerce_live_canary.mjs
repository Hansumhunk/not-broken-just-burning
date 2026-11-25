import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("the canary is a noindex page with explicit click and optional existing account sign in",()=>{
 const html=read("commerce-live-canary.html"), js=read("js/commerce-live-canary.js"), auth=read("js/member-auth.js");
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/id="canary-start"[^>]+disabled/);
 assert.match(html,/id="canary-terms"[^>]+type="checkbox"/);
 assert.match(html,/member-auth\.html\?next=commerce-live-canary\.html/);
 assert.ok(auth.includes("next === 'commerce-live-canary.html'"),"The sign-in flow returns only to this exact safe relative canary page");
 assert.match(js,/auth\?\.refresh\(\)/);
 assert.match(js,/if\(!consent\.checked\)/);
 assert.match(js,/window\.NBJBCommerceLive\?\.enabled!==true/);
 assert.match(js,/const slug='boundary-builder-workbook'/);
 assert.match(js,/window\.NBJBConfig\?\.supabaseUrl===prod/);
 assert.ok(!/sk_live_|rk_live_|SUPABASE_SERVICE_ROLE_KEY|whsec_/.test(html+js),"No payment or service-role secrets in browser files");
});
test("canary source is wired to exact server-side user+SKU gate and private refundable fulfillment",()=>{
 const worker=read("launch-backend-staging/commerce/live/index.ts");
 const core=read("launch-backend-staging/commerce/live/commerce-core.mjs");
 const release=read("js/commerce-release.js");
 assert.match(worker,/permittedCheckout\(\{gate:env\("NBJB_COMMERCE_LIVE_CHECKOUT"\),userId:user\.id,slug/);
 assert.match(worker,/NBJB_COMMERCE_LIVE_CANARY_USER_ID/);
 assert.match(worker,/NBJB_COMMERCE_LIVE_CANARY_SKU/);
 assert.match(worker,/resultPage=env\("NBJB_COMMERCE_LIVE_CHECKOUT"\)==="canary"/);
 assert.match(worker,/await verifyLiveAccount\(stripe/);
 assert.match(worker,/if\(req\.method==="POST" && new URL\(req\.url\)\.pathname\.endsWith\("\/webhook"\)\)return webhook/);
 assert.match(core,/export const LIVE_RUNTIME_REVIEWED = false/);
 assert.match(core,/return typeof userId==='string' && uuid\.test\(userId\)/);
 assert.match(release,/enabled:false/);
});
test("sandbox terms remain separate from specifically versioned LIVE terms",()=>{
 const store=read("store.html"), client=read("js/commerce-store.js");
 assert.match(store,/data-version="draft-v1"/);
 assert.match(client,/consent\.dataset\.version='live-v1'/);
 assert.match(client,/commerce-policy-live-review\.html/);
 assert.match(client,/Review and accept the digital product terms first/);
});

test("public free-account store return accepts exact internal store.html and rejects external or altered destinations",()=>{
 const authSource=read("js/member-auth.js");
 const store=read("store.html");
 assert.ok(store.includes('href="member-auth.html?next=store.html"'),"explicit sign-in path exists without opening checkout");
 function redirect(next){
  let subscriber;
  const link={href:""};
  const auth={onChange(cb){subscriber=cb;}};
  const sandbox={
    window:{NBJBAuth:auth},
    document:{querySelector(selector){return selector==='[data-auth-primary-link]'?link:null;}},
    location:{search:next?'?next='+encodeURIComponent(next):'',hash:''},
    URLSearchParams,Set
  };
  runInNewContext(authSource,sandbox,{filename:"js/member-auth.js"});
  assert.equal(typeof subscriber,"function");
  subscriber({user:{id:"approved-qa-user"}});
  return link.href;
 }
 assert.equal(redirect("store.html"),"store.html");
 assert.equal(redirect("commerce-live-canary.html"),"commerce-live-canary.html");
 assert.equal(redirect("https://external.example/store.html"),"members.html");
 assert.equal(redirect("//external.example"),"members.html");
 assert.equal(redirect("store.html?next=https://external.example"),"members.html");
 assert.equal(redirect("store.html/../admin.html"),"members.html");
 assert.equal(redirect(""),"members.html");
});
