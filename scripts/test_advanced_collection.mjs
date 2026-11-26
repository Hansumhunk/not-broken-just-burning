import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {handle,tierFor} from "../supabase/functions/read-advanced-collection/core.mjs";
const secret="disposable-local-fixture-not-production";
const sign=id=>{const payload=Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+120})).toString("base64url");return payload+"."+createHmac("sha256",secret).update(payload).digest("base64url");};
function verify(token){try{const [p,s,...rest]=token.split(".");if(rest.length)return null;const expected=createHmac("sha256",secret).update(p).digest(),actual=Buffer.from(s,"base64url");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const c=JSON.parse(Buffer.from(p,"base64url"));return c.exp>Date.now()/1000?c.sub:null;}catch{return null;}}
const digest=b=>createHash("sha256").update(b).digest("hex");
test("real loopback HTTP with signed synthetic sessions and private asset bytes",async()=>{
 const rows=[],files=new Map(),members=new Map(),paid={tier:"paid_member",status:"active",provider:"manual",valid_from:"2020-01-01",valid_until:null};
 for(let n=1;n<=14;n++){const id=String(n).padStart(2,"0"),slug="mythic-resilience-l"+id,assets={};
  for(const kind of ["reader","lesson","worksheet"]){const bytes=Buffer.from(kind==="reader"?JSON.stringify({edition:"RC2",slug,blocks:[{type:"p",text:"Synthetic fixture only"}],questions:Array.from({length:5},(_,i)=>({id:"MR-L"+id+"-Q"+(i+1),text:"Fixture question"}))}):"%PDF-1.4 synthetic "+slug+" "+kind);
   const key="fixture/"+slug+"/"+kind+(kind==="reader"?".json":".pdf");files.set(key,bytes);assets[kind]={key,bytes:bytes.length,sha256:digest(bytes)};}
  rows.push({slug,track_slug:"mythic-resilience",lesson_number:n,title:"Synthetic lesson "+n,status:"published",content:{advancedCollection:{edition:"RC2",access:tierFor(n),module:n<=4?1:n<=8?2:n<=11?3:4,objective:"Fixture",minutes:"20 minutes",assets}}});
 }
 members.set("plus",paid);members.set("expired",{...paid,valid_until:"2020-01-02"});members.set("revoked",{...paid,status:"revoked"});
 let enabled=true,hook=null;
 const deps={get enabled(){return enabled;},catalog:async()=>rows,row:async s=>rows.find(x=>x.slug===s),member:async id=>members.get(id),read:async k=>{const b=files.get(k);if(hook)await hook();return new Uint8Array(b);}};
 const server=createServer(async(req,res)=>{try{if(req.url!=="/collection"){res.writeHead(404).end();return;}const chunks=[];for await(const b of req)chunks.push(b);const r=await handle(new Request("http://localhost/collection",{method:"POST",body:Buffer.concat(chunks)}),verify((req.headers.authorization||"").replace(/^Bearer /,"")),deps);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch{res.writeHead(500).end();}});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url="http://127.0.0.1:"+server.address().port;
 const call=(id,body)=>fetch(url+"/collection",{method:"POST",headers:{authorization:id?"Bearer "+sign(id):""},body:JSON.stringify(body)});
 const get=(id,n,action="worksheet",edition="RC2")=>call(id,{action,slug:"mythic-resilience-l"+String(n).padStart(2,"0"),edition});
 try{
 assert.equal((await call(null,{action:"catalog"})).status,401);
 assert.equal((await fetch(url+"/fixture/anything")).status,404);
 assert.equal((await call("free",{action:"catalog"})).status,200);
 assert.equal((await (await call("free",{action:"catalog"})).json()).lessons.filter(x=>x.available).length,4);
 for(let n=1;n<=14;n++){for(const action of ["reader","lesson","worksheet"]){assert.equal((await get("free",n,action)).status,tierFor(n)==="free"?200:403);const r=await get("plus",n,action);assert.equal(r.status,200);if(action!=="reader")assert.equal(digest(Buffer.from(await r.arrayBuffer())),rows[n-1].content.advancedCollection.assets[action].sha256);}}
 assert.equal((await get("expired",2)).status,403);assert.equal((await get("revoked",2)).status,403);
 rows[0].status="editorial_review";assert.equal((await get("plus",1)).status,404);assert.equal((await (await call("plus",{action:"catalog"})).json()).lessons.length,13);rows[0].status="published";
 assert.equal((await get("plus",2,"worksheet","RC1")).status,400);
 assert.equal((await call("plus",{action:"worksheet",slug:rows[0].slug,edition:"RC2",key:"other"})).status,400);
 const a=rows[1].content.advancedCollection.assets.worksheet,b=files.get(a.key);files.set(a.key,Buffer.alloc(b.length));assert.equal((await get("plus",2)).status,503);files.set(a.key,b);
 hook=()=>members.set("plus",{...paid,status:"revoked"});assert.equal((await get("plus",2)).status,403);hook=null;members.set("plus",paid);
 enabled=false;assert.equal((await get("plus",2)).status,404);
 console.log("HTTP synthetic acceptance: 42 free classification checks, 42 Plus deliveries, 28 Plus PDF digest matches; denial/tamper/race cases passed.");
 }finally{await new Promise(r=>server.close(r));}
});
