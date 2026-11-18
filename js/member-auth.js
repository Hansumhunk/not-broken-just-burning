(() => {
  const auth = window.NBJBAuth;
  if (!auth) return;
  const q = (s) => document.querySelector(s);
  const status = q('#auth-status');
  const signedIn = q('#signed-in-state');
  const signedOut = q('#signed-out-state');
  const recovery = q('#recovery-state');
  function setStatus(message, bad=false){ if(!status) return; status.textContent=message||''; status.dataset.state=bad?'error':'ok'; }
  function value(id){
    const input = document.getElementById(id);
    const raw = String(input?.value || '');
    // Whitespace is meaningful in passwords, but not around email addresses.
    return id.includes('password') ? raw : raw.trim();
  }
  function authFlowType(){
    const searchType = new URLSearchParams(location.search).get('type') || '';
    const hashType = new URLSearchParams(location.hash.replace(/^#/, '')).get('type') || '';
    return (searchType || hashType).toLowerCase();
  }
  function nextDestination(fallback='members.html'){
    const next = new URLSearchParams(location.search).get('next') || '';
    if (/^(?:members|member-[a-z0-9-]+)\.html(?:[?#].*)?$/i.test(next)) return next;
    // Only explicit public-tool anchors may resume after sign-in.
    const toolReturns = new Set([
      'forge.html#forge-tool', 'check-in.html#checkin-tool',
      'pattern-map.html#pattern-tool', 'resources.html#boundary-builder',
      'resources.html#one-stone', 'six-sacred-questions.html#six-question-tool'
    ]);
    if (toolReturns.has(next)) return next;
    if (authFlowType() === 'signup') return 'member-onboarding.html';
    return fallback;
  }
  function render({user}){
    const recoveryMode = (
      new URLSearchParams(location.search).get('mode') === 'recovery' ||
      authFlowType() === 'recovery'
    ) && Boolean(user);
    if (signedIn) signedIn.hidden = !user || recoveryMode;
    if (signedOut) signedOut.hidden = Boolean(user);
    if (recovery) recovery.hidden = !recoveryMode;
    if (!user && (new URLSearchParams(location.search).get('mode') === 'recovery' || authFlowType() === 'recovery')) {
      setStatus('Open the recovery link from your email or request a fresh link below.');
    }
    const email = q('[data-auth-email]'); if(email) email.textContent=user?.email||'';
    const signedInLink = q('[data-auth-primary-link]'); if(signedInLink) signedInLink.href=nextDestination('members.html');
  }
  auth.onChange(render);
  let recoveryRequestPending = false;
  let passwordUpdatePending = false;
  function setFormBusy(form, busy) {
    const button = form?.querySelector?.('button[type="submit"]');
    if (button) button.disabled = busy;
  }
  q('#sign-in-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); setStatus('Signing in…'); const {error}=await auth.signIn(value('sign-in-email'),value('sign-in-password')); if(error)return setStatus(error.message,true); setStatus('Signed in. Opening the Flamewalker Hub…'); location.href=nextDestination('members.html'); });
  q('#sign-up-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); setStatus('Creating account…'); const {data,error}=await auth.signUp(value('sign-up-email'),value('sign-up-password')); if(error)return setStatus(error.message,true); if(data.session){ setStatus('Account created. Opening onboarding…'); location.href=nextDestination('member-onboarding.html'); } else setStatus('Account created. Check your email to verify it, then return here.'); });
  q('#magic-link-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); setStatus('Sending sign-in link…'); const {error}=await auth.sendMagicLink(value('magic-email')); setStatus(error?error.message:'If that account exists, a sign-in link has been sent.',Boolean(error)); });
  q('#recovery-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (recoveryRequestPending) return;
    recoveryRequestPending = true;
    setFormBusy(e.currentTarget, true);
    setStatus('Sending recovery link…');
    try {
      const {error} = await auth.sendRecovery(value('recovery-email'));
      if (error && (error.status === 429 || Number(error.status) >= 500)) {
        setStatus('Recovery is temporarily unavailable. Wait a moment and retry, or contact support.', true);
      } else {
        // Do not disclose whether a particular email is registered.
        setStatus('If that account exists, a recovery link has been sent. Check spam or request a new link if it expires.');
      }
    } catch (_) {
      setStatus('Recovery is temporarily unavailable. Retry or contact support.', true);
    } finally {
      recoveryRequestPending = false;
      setFormBusy(e.currentTarget, false);
    }
  });
  q('#new-password-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (passwordUpdatePending) return;
    const p1=value('new-password'); const p2=value('new-password-confirm');
    if(p1.length<8)return setStatus('Use at least 8 characters.',true);
    if(p1!==p2)return setStatus('The passwords do not match.',true);
    passwordUpdatePending = true;
    setFormBusy(e.currentTarget, true);
    try {
      if (auth.refresh) await auth.refresh();
      if (!auth.user?.id || recovery?.hidden) return setStatus('Recovery has expired or is unavailable. Request a new recovery link.',true);
      const {error}=await auth.updatePassword(p1);
      if(error)return setStatus('Password could not be updated. Request a fresh recovery link or contact support.',true);
      setStatus('Password updated. Opening the Flamewalker Hub…');
      history.replaceState({},'', 'member-auth.html');
      location.href=nextDestination('members.html');
    } catch (_) {
      setStatus('Recovery could not be verified. Request a new recovery link.', true);
    } finally {
      passwordUpdatePending = false;
      setFormBusy(e.currentTarget, false);
    }
  });
  q('#sign-out-button')?.addEventListener('click', async ()=>{ setStatus('Signing out…'); const {error}=await auth.signOut(); if(error)return setStatus(error.message,true); setStatus('Signed out.'); });
})();