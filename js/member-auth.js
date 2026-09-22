(() => {
  const auth = window.NBJBAuth;
  if (!auth) return;
  const q = (s) => document.querySelector(s);
  const status = q('#auth-status');
  const signedIn = q('#signed-in-state');
  const signedOut = q('#signed-out-state');
  const recovery = q('#recovery-state');
  function setStatus(message, bad=false){ if(!status) return; status.textContent=message||''; status.dataset.state=bad?'error':'ok'; }
  function value(id){ return (document.getElementById(id)?.value || '').trim(); }
  function render({user}){
    const recoveryMode = new URLSearchParams(location.search).get('mode') === 'recovery' && Boolean(user);
    if (signedIn) signedIn.hidden = !user || recoveryMode;
    if (signedOut) signedOut.hidden = Boolean(user);
    if (recovery) recovery.hidden = !recoveryMode;
    const email = q('[data-auth-email]'); if(email) email.textContent=user?.email||'';
  }
  auth.onChange(render);
  q('#sign-in-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); setStatus('Signing in…'); const {error}=await auth.signIn(value('sign-in-email'),value('sign-in-password')); if(error)return setStatus(error.message,true); setStatus('Signed in. Opening the Flamewalker Hub…'); location.href='members.html'; });
  q('#sign-up-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); setStatus('Creating account…'); const {data,error}=await auth.signUp(value('sign-up-email'),value('sign-up-password')); if(error)return setStatus(error.message,true); if(data.session){ setStatus('Account created. Opening onboarding…'); location.href='member-onboarding.html'; } else setStatus('Account created. Check your email to verify it, then return here.'); });
  q('#magic-link-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); setStatus('Sending sign-in link…'); const {error}=await auth.sendMagicLink(value('magic-email')); setStatus(error?error.message:'If that account exists, a sign-in link has been sent.',Boolean(error)); });
  q('#recovery-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); setStatus('Sending recovery link…'); const {error}=await auth.sendRecovery(value('recovery-email')); setStatus(error?error.message:'If that account exists, a recovery link has been sent.',Boolean(error)); });
  q('#new-password-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); const p1=value('new-password'); const p2=value('new-password-confirm'); if(p1.length<8)return setStatus('Use at least 8 characters.',true); if(p1!==p2)return setStatus('The passwords do not match.',true); const {error}=await auth.updatePassword(p1); if(error)return setStatus(error.message,true); setStatus('Password updated. Opening the Flamewalker Hub…'); history.replaceState({},'', 'member-auth.html'); location.href='members.html'; });
  q('#sign-out-button')?.addEventListener('click', async ()=>{ setStatus('Signing out…'); const {error}=await auth.signOut(); if(error)return setStatus(error.message,true); setStatus('Signed out.'); });
})();