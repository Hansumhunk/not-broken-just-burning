'use strict';
// A proposed policy contract, NOT a production auth implementation or MFA provider.
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const MIN_NEW_PASSWORD=15;
function validateNewPassword(password,confirmation){
 if(typeof password!=='string'||Array.from(password).length<MIN_NEW_PASSWORD)return 'too_short';
 if(password!==confirmation)return 'mismatch';
 return 'accepted'; // do not alter whitespace; actual Auth server enforces its limits
}
function mayUpdatePassword({userId,recoveryId,sessionVerified,recoverySession,requiresMfa,aal}){
 return Boolean(userId&&userId===recoveryId&&sessionVerified&&recoverySession&&(!requiresMfa||aal==='aal2'));
}
async function elevated(auth){
 const {data,error}=await auth.mfa.getAuthenticatorAssuranceLevel();
 return !error&&data?.currentLevel==='aal2';
}
test('new single-factor secret policy: 15 Unicode code points, long passphrases and exact confirmation',()=>{
 assert.equal(validateNewPassword('a'.repeat(14),'a'.repeat(14)),'too_short');
 assert.equal(validateNewPassword('a'.repeat(15),'a'.repeat(15)),'accepted');
 assert.equal(validateNewPassword('🔥'.repeat(8),'🔥'.repeat(8)),'too_short');
 assert.equal(validateNewPassword('a'.repeat(64),'a'.repeat(64)),'accepted');
 assert.equal(validateNewPassword('  long word phrase  ','  long word phrase  '),'accepted');
 assert.equal(validateNewPassword('  long word phrase  ','long word phrase'),'mismatch');
});
test('recovery must be freshly verified and bound to original account; enrolled MFA is not bypassed',()=>{
 const base={userId:'synthetic-a',recoveryId:'synthetic-a',sessionVerified:true,recoverySession:true,requiresMfa:true,aal:'aal2'};
 assert.equal(mayUpdatePassword(base),true);
 for(const patch of [{userId:'synthetic-b'},{recoverySession:false},{sessionVerified:false},{aal:'aal1'},{userId:null}]) assert.equal(mayUpdatePassword({...base,...patch}),false);
 assert.equal(mayUpdatePassword({...base,requiresMfa:false,aal:'aal1'}),true);
});
test('only current AAL2 passes proposed elevated operations, not a claim of future enrollment',async()=>{
 for(const [data,error,allowed] of [[{currentLevel:'aal1',nextLevel:'aal2'},null,false],[{currentLevel:'aal2'},null,true],[null,new Error('expired'),false]]){
  const auth={mfa:{getAuthenticatorAssuranceLevel:async()=>({data,error})}};
  assert.equal(await elevated(auth),allowed);
 }
});
test('RFC 6238 public TOTP vector checks local fixture clock; no provider enrollment or secret storage',()=>{
 // Reference vector from RFC 6238 Appendix B; never use this secret for real users.
 const t=Buffer.alloc(8);t.writeBigUInt64BE(59n/30n);
 const mac=crypto.createHmac('sha1',Buffer.from('12345678901234567890')).update(t).digest();
 const offset=mac[mac.length-1]&15;
 assert.equal(String((mac.readUInt32BE(offset)&0x7fffffff)%100000000).padStart(8,'0'),'94287082');
});
