// Guest possession-of-inbox claim. Raw token is generated at delivery time, never stored.
const te = new TextEncoder();
function bytesToBase64url(bytes) {
 let b = ""; for (const byte of bytes) b += String.fromCharCode(byte);
 return btoa(b).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function base64urlBytes(value) {
 if(typeof value!=="string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
 const b=atob(value.replace(/-/g,"+").replace(/_/g,"/"));
 return Uint8Array.from(b,c=>c.charCodeAt(0));
}
async function keyFor(secret) {
 if(typeof secret!=="string" || secret.length < 48) throw Error("claim_key_unavailable");
 return crypto.subtle.importKey("raw",te.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
function message(order) {
 if(!order || !/^[0-9a-f-]{36}$/i.test(order.id||"")
  || !/^[0-9a-f-]{36}$/i.test(order.claim_nonce||"")
  || typeof order.guest_email!=="string") throw Error("invalid_claim_context");
 return "nbjb:wb001:v1:"+order.id+":"+order.claim_nonce+":"+order.guest_email.toLowerCase();
}
export async function signGuestClaim(order,secret) {
 const sig=await crypto.subtle.sign("HMAC",await keyFor(secret),te.encode(message(order)));
 return bytesToBase64url(new Uint8Array(sig));
}
export async function verifyGuestClaim(order,secret,claim) {
 const sig=base64urlBytes(claim);
 if(!sig)return false;
 try {return await crypto.subtle.verify("HMAC",await keyFor(secret),sig,te.encode(message(order)));}
 catch{return false;}
}
export function guestReceiptLink(origin,order,signature) {
 if(origin!=="https://notbrokenjustburning.com"||!(/^[a-zA-Z0-9_-]{43}$/.test(signature)))
   throw Error("unapproved_origin");
 // Bearer secret in fragment: excluded from HTTP requests, referrers and server logs.
 return origin+"/commerce-guest-access.html#order="+encodeURIComponent(order.id)
   +"&claim="+encodeURIComponent(signature);
}
