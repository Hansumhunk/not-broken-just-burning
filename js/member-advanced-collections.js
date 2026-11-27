(() => {
 "use strict";
 const root=document.getElementById("advanced-collections");
 const auth=window.NBJBAuth;
 if(!root||!auth?.user?.id||!auth.client?.functions?.invoke)return;
 const id=auth.user.id, key="nbjb.plus.lesson-progress.v1."+id;
 const modules=["The Meaning of the Fire","The Mind Under Pressure","Reclaiming the Narrative","Returning With Purpose"];
 const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 let sequence=0, active=null, links=[];
 function clear(){sequence++;active=null;root.hidden=true;root.replaceChildren();for(const url of links)URL.revokeObjectURL(url);links=[];}
 const current=()=>auth.user?.id===id;
 function safety(parent){const p=node("p"),a=node("a","Free Support & Safety resources");a.href="support.html";a.referrerPolicy="no-referrer";p.append("Educational content, not crisis or professional care. ",a);parent.append(p);}
 const request=async body=>{const r=await auth.client.functions.invoke("read-advanced-collection",{body});if(r.error)throw Error("Access could not be verified.");return r.data;};
 const done=()=>{try{return JSON.parse(localStorage.getItem(key)||"{}")||{};}catch(_){return {};}};
 function status(message){const el=root.querySelector("[role=status]");if(el)el.textContent=message;}
 function paragraph(parent,text){parent.append(node("p",text));}
 function renderText(parent,tag,text){
   const p=node(tag);
   // Never use innerHTML; linkify only HTTPS research URLs and never prefetch.
   for(const part of String(text).split(/(https:\/\/[^\s<>"']+)/g)){
     if(!part.startsWith("https://")){p.append(document.createTextNode(part));continue;}
     try{const u=new URL(part);if(u.protocol!=="https:"||u.username||u.password||u.port)throw Error();const a=node("a",part);a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="no-referrer";p.append(a);}catch(_){p.append(document.createTextNode(part));}
   }
   parent.append(p);
 }
 async function download(kind,row,button){
  const token=sequence;button.disabled=true;
  try{const data=await request({action:kind,slug:row.slug,edition:"RC2"});
   if(!current()||token!==sequence||active!==row.slug)return;
   if(!(data instanceof Blob))throw Error("File unavailable");
   const url=URL.createObjectURL(data);links.push(url);
   const a=node("a");a.href=url;a.download=row.slug+"-"+kind+"-RC2.pdf";a.click();setTimeout(()=>{URL.revokeObjectURL(url);links=links.filter(x=>x!==url);},1000);
   status("Download prepared.");
  }catch(_){if(current()&&token===sequence)status("Download unavailable. Recheck your access.");}
  finally{if(current()&&token===sequence)button.disabled=false;}
 }
 async function open(row,panel){
  const token=++sequence;active=row.slug;panel.replaceChildren();status("Checking lesson access…");
  try{
   const data=await request({action:"reader",slug:row.slug,edition:"RC2"});
   if(!current()||token!==sequence)return;
   if(data?.slug!==row.slug||data.edition!=="RC2"||!Array.isArray(data.blocks)||!Array.isArray(data.questions))throw Error();
   const url=new URL(location.href);url.searchParams.set("collection","mythic-resilience");url.searchParams.set("lesson",row.slug);history.replaceState(null,"",url);
   const h=node("h3",data.title);h.tabIndex=-1;panel.append(h);
   paragraph(panel,row.minutes+" · "+row.objective);safety(panel);
   for(const b of data.blocks){if(b.type==="p"||b.type==="h2")renderText(panel,b.type==="h2"?"h4":"p",b.text);}
   const q=node("h4","Optional comprehension");panel.append(q);paragraph(panel,"Think through these questions privately. No answers are saved or scored.");
   const ol=node("ol");for(const item of data.questions)ol.append(node("li",item.text));panel.append(ol);
   for(const [kind,label] of [["lesson","Download lesson PDF"],["worksheet","Download this lesson’s worksheet"]]){
    const b=node("button",label);b.type="button";b.className="button button-ghost";b.addEventListener("click",()=>download(kind,row,b));panel.append(b);
   }
   const mark=node("button",done()[row.slug]?"Remove completion mark":"Mark practiced on this device");mark.type="button";mark.className="button button-primary";
   mark.addEventListener("click",async()=>{if(!current()||active!==row.slug)return;const t=sequence;try{await request({action:"reader",slug:row.slug,edition:"RC2"});if(!current()||t!==sequence)return;const d=done();if(d[row.slug])delete d[row.slug];else d[row.slug]=new Date().toISOString();localStorage.setItem(key,JSON.stringify(d));mark.textContent=d[row.slug]?"Remove completion mark":"Mark practiced on this device";status("Device-local progress updated.");}catch(_){if(current()&&t===sequence)status("Progress not changed. Access could not be verified.");}});panel.append(mark);
   status("Lesson opened.");h.focus();
  }catch(_){if(current()&&token===sequence){panel.replaceChildren();status("Lesson unavailable. Your membership may need verification.");}}
 }
 async function load(){
  const token=++sequence;
  try{const data=await request({action:"catalog"});if(!current()||token!==sequence||!Array.isArray(data?.lessons)||!data.lessons.length)return;
   root.replaceChildren();const h=node("h2","Advanced Collections · Mythic Resilience");root.append(h);
   paragraph(root,"Explore four modules at your own pace. Free lessons never require a preceding Plus lesson. Progress marks are optional and device-local.");
   safety(root);
   const s=node("p");s.setAttribute("role","status");root.append(s);
   const nav=node("nav");nav.setAttribute("aria-label","Mythic Resilience modules");root.append(nav);
   const panel=node("article");panel.setAttribute("aria-label","Authorized lesson");panel.className="advanced-reader";
   for(let m=1;m<=4;m++){nav.append(node("h3",modules[m-1]));const list=node("ul");
    for(const row of data.lessons.filter(x=>x.module===m)){
     const li=node("li"),b=node("button",row.title+" · "+(row.access==="free"?"Free":"Plus"));
     b.type="button";b.className="button button-ghost";b.disabled=!row.available;b.addEventListener("click",()=>open(row,panel));li.append(b);
     paragraph(li,row.minutes+" · "+row.objective+(row.available?"":" · Requires active Plus access"));list.append(li);
    }nav.append(list);
   }root.append(panel);root.hidden=false;
   const params=new URLSearchParams(location.search);const requested=params.get("lesson")||"";const slug=/^mr-l(0[1-9]|1[0-4])$/i.test(requested)?"mythic-resilience-l"+requested.slice(-2):requested;const deep=params.get("collection")==="mythic-resilience"&&data.lessons.find(x=>x.slug===slug&&x.available);if(deep)await open(deep,panel);else if(params.get("collection")==="mythic-resilience"&&requested)status("This lesson is not currently available to your account.");
  }catch(_){if(current()&&token===sequence)clear();}
 }
 auth.onChange?.(({user})=>{if(user?.id!==id)clear();});
 window.addEventListener("pagehide",clear);
 window.addEventListener("nbjb:entitlements",()=>{if(current()){clear();load();}});
 load();
})();
