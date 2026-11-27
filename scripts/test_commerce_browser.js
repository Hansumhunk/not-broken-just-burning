const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/commerce-client.js','utf8'),ref='abcdefghijklmnopqrst',url='https://'+ref+'.supabase.co';
function harness({hostname='qa.example.test',project=ref,enabled=true,user={id:'a'},fetcher}={}){
 const current={user,session:user?{access_token:'fixture-token'}:null};
 const window={NBJBConfig:{supabaseUrl:'https://'+project+'.supabase.co',supabasePublishableKey:'fixture'},NBJBCommercePreview:{enabled,sandboxRef:project},NBJBAuth:{user,refresh:async()=>current}};
 let requests=[];
 const context={window,location:{hostname},URL,fetch:async(u,o)=>{requests.push({u,o});return fetcher?fetcher(window):{ok:true,json:async()=>({url:'https://checkout.stripe.com/c/pay/fixture'})};}};
 vm.runInNewContext(source,context);
 return {window,requests,api:window.NBJBCommerce};
}
test('production host, production project and absent approval disable client',async()=>{
 for(const o of [{hostname:'notbrokenjustburning.com'},{project:'plhbvtbvtxfzulsaxuim'},{enabled:false}]){
  const h=harness(o);assert.equal(h.api.enabled,false);await assert.rejects(h.api.call('checkout'));assert.equal(h.requests.length,0);
 }
});
test('unauthenticated API call fails before network',async()=>{const h=harness({user:null});await assert.rejects(h.api.call('download'),/sign_in_required/);assert.equal(h.requests.length,0);});
test('client checks verified identity after response, including switch during request',async()=>{const h=harness({fetcher:w=>{w.NBJBAuth.user={id:'b'};return {ok:true,json:async()=>({url:'https://checkout.stripe.com/c/pay/fixture'})}}});await assert.rejects(h.api.call('download'),/account_changed/);});
test('checkout and signed URL host and path validation',()=>{const h=harness();assert.equal(h.api.checkoutUrl('https://checkout.stripe.com/c/pay/fixture'),'https://checkout.stripe.com/c/pay/fixture');assert.throws(()=>h.api.checkoutUrl('https://checkout.stripe.com.evil.test/'));assert.throws(()=>h.api.downloadUrl('https://evil.test/storage/v1/object/sign/nbjb-private-products/a'));assert.throws(()=>h.api.downloadUrl(url+'/storage/v1/object/public/nbjb-private-products/a'));assert.match(h.api.downloadUrl(url+'/storage/v1/object/sign/nbjb-private-products/a?token=fixture'),/token=fixture/);});
test('purchase status page does not include general analytics and never carries a grant action',()=>{const html=fs.readFileSync('commerce-result.html','utf8'),js=fs.readFileSync('js/commerce-result.js','utf8');assert.doesNotMatch(html,/js\/main\.js|posthog/i);assert.match(html,/no-referrer/);assert.match(js,/api\.call\('status'/);assert.doesNotMatch(js,/api\.call\('grant'/);});
