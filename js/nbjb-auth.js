(() => {
  const cfg = window.NBJBConfig;
  if (!cfg?.supabaseUrl || !cfg?.supabasePublishableKey || !window.supabase?.createClient) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const listeners = new Set();
  let currentUser = null;
  let currentSession = null;
  function emit() {
    const snapshot = { user: currentUser, session: currentSession };
    listeners.forEach((fn) => { try { fn(snapshot); } catch (_) {} });
    window.dispatchEvent(new CustomEvent('nbjb:auth', { detail: snapshot }));
  }
  async function refresh() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    currentSession = data.session || null;
    currentUser = currentSession?.user || null;
    emit();
    return { user: currentUser, session: currentSession };
  }
  async function signUp(email, password) {
    return client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + '/member-auth.html' } });
  }
  async function signIn(email, password) { return client.auth.signInWithPassword({ email, password }); }
  async function sendMagicLink(email) {
    return client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/member-auth.html' } });
  }
  async function sendRecovery(email) {
    return client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/member-auth.html?mode=recovery' });
  }
  async function updatePassword(password) { return client.auth.updateUser({ password }); }
  async function signOut() { return client.auth.signOut(); }
  function onChange(fn) { listeners.add(fn); fn({ user: currentUser, session: currentSession }); return () => listeners.delete(fn); }
  client.auth.onAuthStateChange((_event, session) => { currentSession = session || null; currentUser = session?.user || null; emit(); });
  window.NBJBAuth = { client, refresh, signUp, signIn, sendMagicLink, sendRecovery, updatePassword, signOut, onChange, get user(){return currentUser;}, get session(){return currentSession;} };
  refresh().catch(() => emit());
})();