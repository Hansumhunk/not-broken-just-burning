(() => {
  const cfg = window.NBJBConfig;
  if (!cfg?.supabaseUrl || !cfg?.supabasePublishableKey || !window.supabase?.createClient) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const listeners = new Set();
  let currentUser = null;
  let currentSession = null;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  let readyResolved = false;
  function markReady() {
    if (readyResolved) return;
    readyResolved = true;
    resolveReady({ user: currentUser, session: currentSession });
  }
  function emit() {
    const snapshot = { user: currentUser, session: currentSession };
    listeners.forEach((fn) => { try { fn(snapshot); } catch (_) {} });
    window.dispatchEvent(new CustomEvent('nbjb:auth', { detail: snapshot }));
  }
  async function refresh() {
    // getSession() restores local browser state; that alone is not a verified
    // identity. Check any restored user against Supabase Auth before allowing
    // protected member pages to load device-scoped account data.
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const restoredSession = data?.session || null;
    if (!restoredSession) {
      currentSession = null;
      currentUser = null;
      emit();
      markReady();
      return { user: null, session: null };
    }
    const verified = await client.auth.getUser();
    if (verified.error || !verified.data?.user ||
        verified.data.user.id !== restoredSession.user?.id) {
      // Keep user-specific views unavailable when the server check fails.
      currentSession = null;
      currentUser = null;
      emit();
      markReady();
      throw verified.error || new Error('Session identity verification failed');
    }
    currentSession = restoredSession;
    currentUser = verified.data.user;
    emit();
    markReady();
    return { user: currentUser, session: currentSession };
  }
  async function signUp(email, password) {
    return client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + '/member-auth.html?next=member-onboarding.html' } });
  }
  async function signIn(email, password) { return client.auth.signInWithPassword({ email, password }); }
  async function sendMagicLink(email) {
    return client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/member-auth.html' } });
  }
  async function sendRecovery(email) {
    return client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/member-auth.html?mode=recovery' });
  }
  async function updatePassword(password) { return client.auth.updateUser({ password }); }
  async function signOut() {
    const result = await client.auth.signOut();
    if (!result.error) {
      // Clear the in-memory identity immediately as well as the Supabase session.
      currentSession = null;
      currentUser = null;
      emit();
    }
    return result;
  }
  function onChange(fn) { listeners.add(fn); fn({ user: currentUser, session: currentSession }); return () => listeners.delete(fn); }
  client.auth.onAuthStateChange((_event, session) => { currentSession = session || null; currentUser = session?.user || null; emit(); markReady(); });
  window.NBJBAuth = { client, ready, refresh, signUp, signIn, sendMagicLink, sendRecovery, updatePassword, signOut, onChange, get user(){return currentUser;}, get session(){return currentSession;} };
  refresh().catch(() => { emit(); markReady(); });
})();