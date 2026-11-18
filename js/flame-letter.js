/* Public configuration only. Do not enter API credentials, subscriber data or secret tokens.
   Release requires founder authorization, verified form, reviewed privacy notice and successful pilot.
   Keep both gates false until the release PR is approved. */
(function () {
  'use strict';
  const CONFIG = Object.freeze({ enabled: false, privacyReviewed: false, hostedFormUrl: '' });

  function approvedSignupUrl(config) {
    if (!config || config.enabled !== true || config.privacyReviewed !== true ||
        typeof config.hostedFormUrl !== 'string' || !config.hostedFormUrl.trim()) return null;
    try {
      const url = new URL(config.hostedFormUrl);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.username || url.password || url.port ||
          !(host === 'sibforms.com' || host.endsWith('.sibforms.com')) ||
          !url.pathname.startsWith('/serve/') || url.pathname.length <= 7 ||
          url.search || url.hash) return null;
      return url.href;
    } catch (_) { return null; }
  }

  function captureSignupIntent(env) {
    if (!env || !['notbrokenjustburning.com','www.notbrokenjustburning.com'].includes(env.location?.hostname) ||
        env.navigator?.globalPrivacyControl === true || env.navigator?.doNotTrack === '1' ||
        env.doNotTrack === '1') return;
    try { env.posthog?.capture?.('nbjb_flame_letter_signup_intent', { placement: 'landing_page' }); }
    catch (_) { /* Analytics failure must never interrupt signup navigation. */ }
  }

  function renderSignup(config, doc, env) {
    const url = approvedSignupUrl(config);
    const container = doc.querySelector('[data-flame-letter-signup]');
    if (!container || !url) return false;
    const button = doc.createElement('a');
    button.className = 'button button-primary';
    button.textContent = 'Subscribe to The Flame Letter';
    button.href = url;
    button.referrerPolicy = 'no-referrer';
    button.rel = 'noreferrer';
    button.addEventListener('click', () => captureSignupIntent(env));
    container.replaceChildren(button);
    const status = doc.querySelector('[data-flame-letter-status]');
    if (status) status.textContent = 'Free weekly email. Confirm your subscription in your inbox. No account required.';
    const stage = doc.querySelector('[data-flame-letter-stage]');
    if (stage) stage.textContent = 'The Flame Letter';
    const note = doc.querySelector('[data-flame-letter-provider-note]');
    if (note) note.textContent = 'The link opens the Brevo-hosted signup form. No email is entered or stored on this page.';
    return true;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { CONFIG, approvedSignupUrl, captureSignupIntent, renderSignup };
  else if (typeof document !== 'undefined') renderSignup(CONFIG, document, window);
}());
