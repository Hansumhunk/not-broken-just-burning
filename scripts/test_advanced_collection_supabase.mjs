import assert from "node:assert/strict";
import {createHash,randomBytes} from "node:crypto";
const base=new URL(process.env.API_URL);
assert.equal(base.protocol,"http:");
assert(["127.0.0.1","localhost"].includes(base.hostname));
const url=base.origin;
const anon=process.env.ANON_KEY||process.env.PUBLISHABLE_KEY,service=process.env.SERVICE_ROLE_KEY||process.env.SECRET_KEY;
assert(anon&&service&&anon!==service,"local fixture keys missing");
const password=randomBytes(24).toString("hex")+"Aa1!";
const bucket="advanced-fixture-only",hash=b=>createHash("sha256").update(b).digest("hex");
async function api(path,{key=service,token=key,method="GET",body,headers={}}={}){
  const target=new URL(path,url);assert.equal(target.origin,url);
  return fetch(target,{method,headers:{apikey:key,Authorization:"Bearer "+token,...(body===undefined?{}:{"Content-Type":"application/json"}),...headers},body:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body),redirect:"error"});
}
async function ok(r,label){assert(r.ok,label+" returned "+r.status);return r;}
const users={};
for(const name of ["free","plus","expired","revoked"]){
 const email=name+"@example.invalid";
 const created=await (await ok(await api("/auth/v1/admin/users",{method:"POST",body:{email,password,email_confirm:true}}),"create fixture user")).json();
 const signed=await (await ok(await api("/auth/v1/token?grant_type=password",{key:anon,method:"POST",body:{email,password}}),"real local password login")).json();
 assert(signed.access_token&&created.id);
 const jwtHeader=JSON.parse(Buffer.from(signed.access_token.split(".")[0],"base64url"));
 assert(["ES256","RS256"].includes(jwtHeader.alg),"actual Auth did not issue asymmetric JWT");
 users[name]={id:created.id,token:signed.access_token};
}
console.log("PASS four real local Supabase Auth password sessions, asymmetric JWTs");
const member=(name,status="active",end=null)=>({user_id:users[name].id,tier:"paid_member",status,provider:"manual",valid_from:"2020-01-01T00:00:00Z",valid_until:end});
await ok(await api("/rest/v1/membership_entitlements",{method:"POST",body:[member("plus"),member("expired","active","2020-01-02T00:00:00Z"),member("revoked","revoked")]}),"seed isolated memberships");
await ok(await api("/storage/v1/bucket",{method:"POST",body:{id:bucket,name:bucket,public:false}}),"create local private bucket");
const rows=[],files=new Map(),free=new Set([1,3,6,11]);
for(let n=1;n<=14;n++){
 const id=String(n).padStart(2,"0"),slug="mythic-resilience-l"+id,assets={};
 for(const kind of ["reader","lesson","worksheet"]){
   const bytes=Buffer.from(kind==="reader"?JSON.stringify({edition:"RC2",slug,blocks:[{type:"p",text:"Synthetic content only"}],questions:Array.from({length:5},(_,i)=>({id:"MR-L"+id+"-Q"+(i+1),text:"Fixture question"}))}):"%PDF-1.4 synthetic "+slug+" "+kind);
   const key="fixture/"+slug+"/"+kind+(kind==="reader"?".json":".pdf");
   files.set(key,bytes);assets[kind]={key,bytes:bytes.length,sha256:hash(bytes)};
   await ok(await api("/storage/v1/object/"+bucket+"/"+key,{method:"POST",body:bytes,headers:{"Content-Type":kind==="reader"?"application/json":"application/pdf"}}),"private storage seed");
 }
 rows.push({slug,track_slug:"mythic-resilience",lesson_number:n,title:"Synthetic lesson "+n,status:"draft",content:{advancedCollection:{edition:"RC2",access:free.has(n)?"free":"plus",module:n<=4?1:n<=8?2:n<=11?3:4,objective:"Fixture objective",minutes:"20 minutes",assets}}});
}
await ok(await api("/rest/v1/flamewalker_premium_lessons",{method:"POST",body:rows}),"seed isolated drafts");
const endpoint="/functions/v1/read-advanced-collection";
const call=(name,body,token)=>api(endpoint,{key:anon,token:token??users[name]?.token??"",method:"POST",body,headers:{Origin:"http://fixture.local"}});
const get=(name,n,kind="worksheet",edition="RC2")=>call(name,{action:kind,slug:rows[n-1].slug,edition});
assert.equal((await call("none",{action:"catalog"})).status,401);
assert.equal((await call("none",{action:"catalog"},"forged.invalid.token")).status,401);
const pre=await fetch(url+endpoint,{method:"OPTIONS",headers:{Origin:"http://fixture.local","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"authorization,apikey,content-type"}});
assert(pre.ok&&pre.headers.get("access-control-allow-origin"),"CORS preflight");
const draft=await (await ok(await call("plus",{action:"catalog"}),"draft catalog")).json();assert.equal(draft.lessons.length,0);assert.equal((await get("plus",1)).status,404);
const direct=await api("/storage/v1/object/authenticated/"+bucket+"/"+rows[0].content.advancedCollection.assets.worksheet.key,{key:anon,token:users.free.token});
assert(!direct.ok,"direct private object should be denied");
const raw=await api("/rest/v1/flamewalker_premium_lessons?select=*",{key:anon,token:users.plus.token});assert(!raw.ok,"direct protected DB rows should be denied");
console.log("PASS actual auth denial, forged token, CORS, draft catalog/reader, direct Storage and PostgREST denial");
await ok(await api("/rest/v1/flamewalker_premium_lessons?track_slug=eq.mythic-resilience",{method:"PATCH",body:{status:"published"}}),"synthetic publication for test");
let allowed=0,denied=0,deliveries=0,pdfHashes=0;
for(let n=1;n<=14;n++){
 for(const kind of ["reader","lesson","worksheet"]){
  const r=await get("free",n,kind);assert.equal(r.status,free.has(n)?200:403);free.has(n)?allowed++:denied++;
  const paid=await get("plus",n,kind);assert.equal(paid.status,200);deliveries++;
  assert.match(paid.headers.get("cache-control")||"",/no-store/);
  if(kind==="reader"){const data=await paid.json();assert.equal(data.questions.length,5);assert.equal(data.slug,rows[n-1].slug);assert(!("assets" in data));}
  else{assert.equal(hash(Buffer.from(await paid.arrayBuffer())),rows[n-1].content.advancedCollection.assets[kind].sha256);pdfHashes++;}
 }
}
assert.equal((await get("expired",2)).status,403);assert.equal((await get("revoked",2)).status,403);
assert.equal((await get("plus",2,"worksheet","RC1")).status,400);
assert.equal((await call("free",{action:"worksheet",slug:rows[1].slug,edition:"RC2",userId:users.plus.id})).status,400);
const original=rows[0].content;
const crossed=structuredClone(original);crossed.advancedCollection.assets.worksheet=rows[1].content.advancedCollection.assets.worksheet;
await ok(await api("/rest/v1/flamewalker_premium_lessons?slug=eq."+rows[0].slug,{method:"PATCH",body:{content:crossed}}),"misconfigure scoped pointer in disposable fixture");
assert.equal((await get("free",1)).status,503);
await ok(await api("/rest/v1/flamewalker_premium_lessons?slug=eq."+rows[0].slug,{method:"PATCH",body:{content:original}}),"restore scoped pointer");
assert.equal((await call("free",{action:"worksheet",slug:[rows[0].slug],edition:"RC2"})).status,400);
console.log("PASS cross-lesson misconfiguration denial and strict slug type");
const key=rows[1].content.advancedCollection.assets.worksheet.key;
await ok(await api("/storage/v1/object/"+bucket+"/"+key,{method:"POST",body:Buffer.alloc(files.get(key).length),headers:{"Content-Type":"application/pdf","x-upsert":"true"}}),"tamper synthetic object");
assert.equal((await get("plus",2)).status,503);
await ok(await api("/storage/v1/object/"+bucket+"/"+key,{method:"POST",body:files.get(key),headers:{"Content-Type":"application/pdf","x-upsert":"true"}}),"restore synthetic object");
await ok(await api("/rest/v1/membership_entitlements?user_id=eq."+users.plus.id,{method:"PATCH",body:{status:"revoked"}}),"revoke synthetic membership");
assert.equal((await get("plus",2)).status,403);
await ok(await api("/rest/v1/flamewalker_premium_lessons?slug=eq."+rows[0].slug,{method:"PATCH",body:{status:"draft"}}),"unpublish synthetic row");
assert.equal((await get("free",1)).status,404);
console.log("PASS actual local Supabase: "+allowed+" Free allowed, "+denied+" premium denied, "+deliveries+" Plus deliveries, "+pdfHashes+" exact synthetic PDF hashes; expiry/revocation, version, caller override, tamper, unpublish.");
console.log("No hosted service or real IP was used. Local fixture does not simulate a concurrent storage race; exact core loopback test covers that separately.");
