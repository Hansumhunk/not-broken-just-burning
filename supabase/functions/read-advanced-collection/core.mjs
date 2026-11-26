// No educational payloads, private object identifiers or credentials in source.
const headers = {"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow, noarchive"};
const reply=(data,status=200)=>Response.json(data,{status,headers});
const free=new Set([1,3,6,11]);
const slugPattern=/^mythic-resilience-l(0[1-9]|1[0-4])$/;
const number=s=>typeof s==="string"?Number(slugPattern.exec(s)?.[1]||0):0;
const moduleFor=n=>n<=4?1:n<=8?2:n<=11?3:4;
export const tierFor=n=>free.has(n)?"free":"plus";
export function paid(m,now=Date.now()){
 const date=(v,future)=>v==null?future:Number.isFinite(Date.parse(v))&&(future?Date.parse(v)>now:Date.parse(v)<=now);
 return m?.tier==="paid_member"&&["active","trialing","past_due"].includes(m.status)&&date(m.valid_from,false)&&(m.provider!=="stripe"||m.valid_until!=null)&&date(m.valid_until,true);
}
function valid(row){
 const n=number(row?.slug), c=row?.content?.advancedCollection;
 return !!(n&&row.track_slug==="mythic-resilience"&&row.lesson_number===n&&c?.edition==="RC2"&&c?.module===moduleFor(n)&&c?.access===tierFor(n)&&typeof row.title==="string"&&typeof c.objective==="string"&&typeof c.minutes==="string");
}
function allowed(row,member){return valid(row)&&row.status==="published"&&(tierFor(number(row.slug))==="free"||paid(member));}
function asset(row,kind){
 const a=row.content.advancedCollection.assets?.[kind];
 // All identifiers originate in a private server-side row, never in request data.
 if(!a||typeof a.key!=="string"||a.key.length>300||!/^[-a-zA-Z0-9_/]+[.](?:pdf|json)$/.test(a.key)||a.key.includes("//")||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>2000000||!/^[a-f0-9]{64}$/.test(a.sha256||""))return null;
 // Reject cross-lesson, combined-workbook and wrong-kind pointers even if a row is misconfigured.
 const leaf=kind+(kind==="reader"?".json":".pdf");
 if(a.key.split("/").slice(-2).join("/")!==row.slug+"/"+leaf)return null;
 return a;
}
async function verified(bytes,a){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==a.bytes)return false;
 const hex=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");
 return hex===a.sha256;
}
export async function handle(req, userId, deps){
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 if(!userId)return reply({error:"unauthorized"},401);
 if(!deps.enabled)return reply({error:"collection_unavailable"},404);
 try {
 const b=await req.json().catch(()=>null);
 if(!b||typeof b!=="object"||Array.isArray(b))return reply({error:"invalid_request"},400);
 // No arbitrary user, storage, role or URL input.
 if(Object.keys(b).some(k=>!["action","slug","edition"].includes(k)))return reply({error:"invalid_request"},400);
 if(b.action==="catalog"){
   const member=await deps.member(userId);
   const rows=(await deps.catalog()).filter(r=>valid(r)&&r.status==="published").sort((a,b)=>a.lesson_number-b.lesson_number);
   return reply({collection:"mythic-resilience",edition:"RC2",lessons:rows.map(r=>({slug:r.slug,title:r.title,module:r.content.advancedCollection.module,order:r.lesson_number,access:r.content.advancedCollection.access,minutes:r.content.advancedCollection.minutes,objective:r.content.advancedCollection.objective,available:allowed(r,member)}))});
 }
 if(!["reader","lesson","worksheet"].includes(b.action)||!number(b.slug)||b.edition!=="RC2")return reply({error:"invalid_edition_or_lesson"},400);
 const row=await deps.row(b.slug);
 if(!valid(row)||row.status!=="published")return reply({error:"lesson_not_available"},404);
 if(!allowed(row,await deps.member(userId)))return reply({error:"membership_required"},403);
 const a=asset(row,b.action);
 if(!a)return reply({error:"asset_unavailable"},503);
 const bytes=await deps.read(a.key);
 if(!await verified(bytes,a))return reply({error:"asset_unavailable"},503);
 // Re-read both authorization and exact asset identity after the potentially slow object read.
 const latest=await deps.row(b.slug), member=await deps.member(userId);
 if(!allowed(latest,member))return reply({error:"access_changed"},403);
 const current=asset(latest,b.action);
 if(!current||current.key!==a.key||current.sha256!==a.sha256||current.bytes!==a.bytes)return reply({error:"edition_changed"},409);
 if(deps.sessionActive&&!await deps.sessionActive(userId))return reply({error:"unauthorized"},401);
 if(b.action==="reader"){
  const data=JSON.parse(new TextDecoder().decode(bytes));
  if(data?.edition!=="RC2"||data.slug!==b.slug||!Array.isArray(data.blocks)||data.blocks.length>1000||!Array.isArray(data.questions)||data.questions.length!==5||!data.questions.every((q,i)=>q?.id==="MR-L"+String(number(b.slug)).padStart(2,"0")+"-Q"+(i+1)&&typeof q.text==="string")||!data.blocks.every(x=>["h2","p"].includes(x?.type)&&typeof x.text==="string"))return reply({error:"asset_unavailable"},503);
  return reply({slug:b.slug,title:latest.title,edition:"RC2",blocks:data.blocks,questions:data.questions});
 }
 return new Response(bytes,{status:200,headers:{...headers,"Content-Type":"application/octet-stream","Content-Disposition":'attachment; filename="'+b.slug+"-"+b.action+'-RC2.pdf"'}});
 } catch (_) {return reply({error:"collection_unavailable"},503);}
}
