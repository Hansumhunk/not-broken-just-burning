// Shared NBJB visual and experience layers.
['css/brand.css', 'css/experience.css'].forEach((href) => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = href;
  document.head.appendChild(stylesheet);
});

if (!document.querySelector('link[rel="icon"]')) {
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/svg+xml';
  favicon.href = 'assets/favicon.svg';
  document.head.appendChild(favicon);
}

const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const year = document.querySelector('#year');
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// V0.8 launch metadata fallback. Static tags remain preferred on major pages,
// but every public page gets a canonical custom-domain URL at runtime.
const SITE_ORIGIN = 'https://notbrokenjustburning.com';
const canonicalPath = currentPage === 'index.html' ? '/' : `/${currentPage}`;
const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;

if (!document.querySelector('link[rel="canonical"]')) {
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = canonicalUrl;
  document.head.appendChild(canonical);
}

if (!document.querySelector('meta[property="og:url"]')) {
  const ogUrl = document.createElement('meta');
  ogUrl.setAttribute('property', 'og:url');
  ogUrl.content = canonicalUrl;
  document.head.appendChild(ogUrl);
}

if (!document.querySelector('meta[property="og:title"]')) {
  const ogTitle = document.createElement('meta');
  ogTitle.setAttribute('property', 'og:title');
  ogTitle.content = document.title;
  document.head.appendChild(ogTitle);
}

if (!document.querySelector('meta[property="og:description"]')) {
  const description = document.querySelector('meta[name="description"]')?.content;
  if (description) {
    const ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    ogDescription.content = description;
    document.head.appendChild(ogDescription);
  }
}

if (!document.querySelector('meta[property="og:type"]')) {
  const ogType = document.createElement('meta');
  ogType.setAttribute('property', 'og:type');
  ogType.content = 'website';
  document.head.appendChild(ogType);
}

if (!document.querySelector('meta[property="og:site_name"]')) {
  const siteName = document.createElement('meta');
  siteName.setAttribute('property', 'og:site_name');
  siteName.content = 'Not Broken Just Burning';
  document.head.appendChild(siteName);
}

if (!document.querySelector('meta[name="twitter:card"]')) {
  const twitterCard = document.createElement('meta');
  twitterCard.name = 'twitter:card';
  twitterCard.content = 'summary';
  document.head.appendChild(twitterCard);
}

// V0.6 engagement layer: expose Join from every existing page without rewriting every header.
if (siteNav && !siteNav.querySelector('a[href="join.html"]')) {
  const joinLink = document.createElement('a');
  joinLink.href = 'join.html';
  joinLink.textContent = 'Join';
  joinLink.className = 'nav-join';
  if (currentPage === 'join.html') joinLink.classList.add('active');
  siteNav.appendChild(joinLink);
}

const navLinks = document.querySelectorAll('.site-nav a');

if (year) year.textContent = new Date().getFullYear();

// Permanent public routes: Contact, Support & Safety, and Privacy & Data Use.
const footerMeta = document.querySelector('.footer-meta');
if (footerMeta) {
  let footerLinks = footerMeta.querySelector('.footer-links');
  if (!footerLinks) {
    const existingSupport = footerMeta.querySelector('a[href="support.html"]');
    footerLinks = existingSupport?.closest('p') || null;
  }
  if (!footerLinks) {
    footerLinks = document.createElement('p');
    const disclaimer = footerMeta.querySelector('.disclaimer');
    footerMeta.insertBefore(footerLinks, disclaimer || null);
  }
  footerLinks.classList.add('footer-links');
  footerLinks.innerHTML = '<a href="contact.html">Contact</a> · <a href="support.html">Support &amp; Safety</a> · <a href="privacy.html">Privacy &amp; Data Use</a>';
}

function closeNavigation() {
  if (!siteNav || !navToggle) return;
  siteNav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation');
}

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  navLinks.forEach((link) => link.addEventListener('click', closeNavigation));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNavigation();
  });
}

const revealItems = document.querySelectorAll('.reveal');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      activeObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -28px 0px' });

  revealItems.forEach((item) => observer.observe(item));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    return copied;
  }
}

function flashStatus(element, message) {
  if (!element) return;
  element.textContent = message;
  window.setTimeout(() => {
    if (element.textContent === message) element.textContent = '';
  }, 3000);
}

// THE FORGE: all entries remain in the visitor's browser only.
const forgeThought = document.querySelector('#forge-thought');
const forgeRewrite = document.querySelector('#forge-rewrite');
const forgeFields = document.querySelectorAll('[data-forge]');
const copyForge = document.querySelector('#copy-forge');
const clearForge = document.querySelector('#clear-forge');
const forgeStatus = document.querySelector('#forge-status');

function buildForgeNotes() {
  const labels = {
    know: 'What I actually know',
    assume: 'What I am assuming',
    support: 'Evidence that supports the thought',
    challenge: 'Evidence that challenges the thought',
    pattern: 'The pattern I am seeing',
    compassion: 'What I would tell someone I love'
  };

  const sections = [
    'NOT BROKEN JUST BURNING — THE FORGE', '',
    `THE THOUGHT\n${forgeThought?.value.trim() || '(blank)'}`, ''
  ];

  forgeFields.forEach((field) => {
    sections.push(`${labels[field.dataset.forge]}\n${field.value.trim() || '(blank)'}`, '');
  });

  sections.push(
    'SIX SACRED QUESTIONS', 'Who? What? When? Where? Why? How?', '',
    `FORGED VERSION\n${forgeRewrite?.value.trim() || '(blank)'}`, '',
    'Reflection tool only. Not medical, mental-health, legal, or emergency advice.'
  );

  return sections.join('\n');
}

if (copyForge) {
  copyForge.addEventListener('click', async () => {
    const copied = await copyText(buildForgeNotes());
    flashStatus(forgeStatus, copied ? 'Copied to clipboard.' : 'Copy failed.');
  });
}

if (clearForge) {
  clearForge.addEventListener('click', () => {
    if (forgeThought) forgeThought.value = '';
    if (forgeRewrite) forgeRewrite.value = '';
    forgeFields.forEach((field) => { field.value = ''; });
    flashStatus(forgeStatus, 'Forge cleared.');
    forgeThought?.focus();
  });
}

// BOUNDARY BUILDER: converts four reflections into a plain-language boundary statement.
const boundaryBehavior = document.querySelector('#boundary-behavior');
const boundaryImpact = document.querySelector('#boundary-impact');
const boundaryLine = document.querySelector('#boundary-line');
const boundaryAction = document.querySelector('#boundary-action');
const boundaryPreview = document.querySelector('#boundary-preview');
const boundaryStatus = document.querySelector('#boundary-status');

function buildBoundaryText() {
  const behavior = boundaryBehavior?.value.trim();
  const impact = boundaryImpact?.value.trim();
  const line = boundaryLine?.value.trim();
  const action = boundaryAction?.value.trim();

  if (![behavior, line, action].some(Boolean)) return '';

  return [
    behavior ? `When ${behavior}` : 'When this behavior happens',
    impact ? `, it affects ${impact}` : '',
    line ? `. My boundary is: ${line}` : '',
    action ? `. If it continues, I will ${action}` : '',
    '.'
  ].join('').replace(/\.\./g, '.');
}

const buildBoundary = document.querySelector('#build-boundary');
if (buildBoundary) {
  buildBoundary.addEventListener('click', () => {
    const text = buildBoundaryText();
    if (boundaryPreview) boundaryPreview.textContent = text || 'Add at least the behavior, boundary, or action so there is something to forge.';
  });
}

document.querySelector('#copy-boundary')?.addEventListener('click', async () => {
  const text = buildBoundaryText();
  if (!text) return flashStatus(boundaryStatus, 'Build the boundary first.');
  flashStatus(boundaryStatus, await copyText(text) ? 'Boundary copied.' : 'Copy failed.');
});

document.querySelector('#clear-boundary')?.addEventListener('click', () => {
  [boundaryBehavior, boundaryImpact, boundaryLine, boundaryAction].forEach((field) => { if (field) field.value = ''; });
  if (boundaryPreview) boundaryPreview.textContent = 'Fill in the four boxes above, then forge the boundary.';
  flashStatus(boundaryStatus, 'Boundary cleared.');
  boundaryBehavior?.focus();
});

// ONE STONE: reduces an overwhelming problem to the next controllable action.
const stoneMountain = document.querySelector('#stone-mountain');
const stoneNow = document.querySelector('#stone-now');
const stoneLater = document.querySelector('#stone-later');
const stonePreview = document.querySelector('#stone-preview');
const stoneStatus = document.querySelector('#stone-status');

function buildStoneText() {
  const mountain = stoneMountain?.value.trim();
  const now = stoneNow?.value.trim();
  const later = stoneLater?.value.trim();
  if (!now && !mountain) return '';
  return [
    mountain ? `THE MOUNTAIN: ${mountain}` : '',
    now ? `ONE STONE NOW: ${now}` : '',
    later ? `NOT FOR RIGHT NOW: ${later}` : ''
  ].filter(Boolean).join('\n\n');
}

document.querySelector('#build-stone')?.addEventListener('click', () => {
  const now = stoneNow?.value.trim();
  if (stonePreview) {
    stonePreview.textContent = now ? `For now, your job is only this: ${now}` : 'Name one realistic action you can complete next.';
  }
});

document.querySelector('#copy-stone')?.addEventListener('click', async () => {
  const text = buildStoneText();
  if (!text) return flashStatus(stoneStatus, 'Name the mountain or one stone first.');
  flashStatus(stoneStatus, await copyText(text) ? 'Next step copied.' : 'Copy failed.');
});

document.querySelector('#clear-stone')?.addEventListener('click', () => {
  [stoneMountain, stoneNow, stoneLater].forEach((field) => { if (field) field.value = ''; });
  if (stonePreview) stonePreview.textContent = 'Name one stone. The mountain can remain a mountain for the next five minutes.';
  flashStatus(stoneStatus, 'Planner cleared.');
  stoneMountain?.focus();
});

// PATTERN MAP: organizes repetition while explicitly separating evidence from inference.
const patternEvent = document.querySelector('#pattern-event');
const patternFields = document.querySelectorAll('[data-pattern]');
const patternSummary = document.querySelector('#pattern-summary');
const patternStatus = document.querySelector('#pattern-status');

function patternValue(name) {
  return document.querySelector(`[data-pattern="${name}"]`)?.value.trim() || '';
}

function buildPatternSummary() {
  const repeated = patternValue('repeat');
  const evidence = patternValue('evidence');
  const inference = patternValue('inference');
  const changed = patternValue('changed');
  const pieces = [];

  if (repeated) pieces.push(`I notice this repetition: ${repeated}`);
  if (evidence) pieces.push(`What I can verify: ${evidence}`);
  if (inference) pieces.push(`What I am still inferring: ${inference}`);
  if (changed) pieces.push(`Important differences or exceptions: ${changed}`);

  if (!pieces.length) return '';
  return `${pieces.join('. ')}. This pattern may be worth examining, but repetition by itself does not prove motive or cause.`;
}

function buildPatternNotes() {
  const labels = {
    before: 'What happened before',
    after: 'What happened after',
    repeat: 'What has repeated',
    changed: 'What is different this time',
    evidence: 'What I can verify',
    inference: 'What I am inferring'
  };
  const sections = [
    'NOT BROKEN JUST BURNING — PATTERN MAP', '',
    `ANCHOR EVENT\n${patternEvent?.value.trim() || '(blank)'}`, ''
  ];

  patternFields.forEach((field) => {
    sections.push(`${labels[field.dataset.pattern]}\n${field.value.trim() || '(blank)'}`, '');
  });

  sections.push(
    `CAREFUL SUMMARY\n${patternSummary?.value.trim() || buildPatternSummary() || '(blank)'}`, '',
    'Reminder: a pattern can guide questions and verification. It does not by itself prove motive, intent, or cause.'
  );
  return sections.join('\n');
}

document.querySelector('#build-pattern')?.addEventListener('click', () => {
  const summary = buildPatternSummary();
  if (!summary) return flashStatus(patternStatus, 'Add some repetition, evidence, inference, or differences first.');
  if (patternSummary && !patternSummary.value.trim()) patternSummary.value = summary;
  flashStatus(patternStatus, 'Pattern notes organized.');
});

document.querySelector('#copy-pattern')?.addEventListener('click', async () => {
  const hasContent = patternEvent?.value.trim() || Array.from(patternFields).some((field) => field.value.trim()) || patternSummary?.value.trim();
  if (!hasContent) return flashStatus(patternStatus, 'Add something to the map first.');
  flashStatus(patternStatus, await copyText(buildPatternNotes()) ? 'Pattern notes copied.' : 'Copy failed.');
});

document.querySelector('#clear-pattern')?.addEventListener('click', () => {
  if (patternEvent) patternEvent.value = '';
  if (patternSummary) patternSummary.value = '';
  patternFields.forEach((field) => { field.value = ''; });
  flashStatus(patternStatus, 'Pattern Map cleared.');
  patternEvent?.focus();
});

// FLAME CHECK-IN: a short daily state snapshot, intentionally lighter than The Forge.
const checkinFields = document.querySelectorAll('[data-checkin]');
const checkinPreview = document.querySelector('#checkin-preview');
const checkinStatus = document.querySelector('#checkin-status');

function checkinValue(name) {
  return document.querySelector(`[data-checkin="${name}"]`)?.value.trim() || '';
}

function buildCheckinText() {
  const labels = {
    body: 'BODY',
    emotion: 'EMOTION',
    thought: 'THOUGHT',
    boundary: 'BOUNDARY',
    need: 'NEED',
    next: 'NEXT ACTION'
  };
  const sections = ['NOT BROKEN JUST BURNING — FLAME CHECK-IN', new Date().toLocaleString(), ''];
  checkinFields.forEach((field) => {
    if (field.value.trim()) sections.push(`${labels[field.dataset.checkin]}: ${field.value.trim()}`);
  });
  sections.push('', 'Personal reflection only. Not medical, mental-health, legal, or emergency advice.');
  return sections.join('\n');
}

document.querySelector('#build-checkin')?.addEventListener('click', () => {
  const emotion = checkinValue('emotion');
  const need = checkinValue('need');
  const next = checkinValue('next');
  const body = checkinValue('body');
  const parts = [];
  if (body) parts.push(`Body: ${body}`);
  if (emotion) parts.push(`Emotion: ${emotion}`);
  if (need) parts.push(`Need: ${need}`);
  if (next) parts.push(`Next: ${next}`);
  if (checkinPreview) checkinPreview.textContent = parts.length ? parts.join(' • ') : 'Add whatever is useful. You do not need to complete every field.';
  flashStatus(checkinStatus, parts.length ? 'Check-in built.' : 'No problem. Blank is data too.');
});

document.querySelector('#copy-checkin')?.addEventListener('click', async () => {
  const hasContent = Array.from(checkinFields).some((field) => field.value.trim());
  if (!hasContent) return flashStatus(checkinStatus, 'Add at least one check-in item first.');
  flashStatus(checkinStatus, await copyText(buildCheckinText()) ? 'Check-in copied.' : 'Copy failed.');
});

document.querySelector('#clear-checkin')?.addEventListener('click', () => {
  checkinFields.forEach((field) => { field.value = ''; });
  if (checkinPreview) checkinPreview.textContent = 'Fill in what matters. Blank fields are allowed. Humans are not forms to be completed at 100%.';
  flashStatus(checkinStatus, 'Check-in cleared.');
  checkinFields[0]?.focus();
});

// FLAMEWALKER COMMITMENT: optional, private, and intentionally not a membership record.
const commitmentBoxes = document.querySelectorAll('[data-commitment]');
const commitmentPreview = document.querySelector('#commitment-preview');
const commitmentStatus = document.querySelector('#commitment-status');

function selectedCommitments() {
  return Array.from(commitmentBoxes).filter((box) => box.checked).map((box) => box.value);
}

function buildCommitmentText() {
  const selected = selectedCommitments();
  if (!selected.length) return '';
  return [
    'NOT BROKEN JUST BURNING — MY FLAMEWALKER COMMITMENT', '',
    ...selected.map((item) => `• ${item}`), '',
    'See clearly. Burn clean. Build deliberately.', '',
    'Personal reflection only. This is not membership, certification, or a contract.'
  ].join('\n');
}

document.querySelector('#build-commitment')?.addEventListener('click', () => {
  const selected = selectedCommitments();
  if (!selected.length) return flashStatus(commitmentStatus, 'Choose at least one statement first.');
  if (commitmentPreview) commitmentPreview.textContent = selected.join(' ');
  flashStatus(commitmentStatus, 'Commitment built.');
});

document.querySelector('#copy-commitment')?.addEventListener('click', async () => {
  const text = buildCommitmentText();
  if (!text) return flashStatus(commitmentStatus, 'Choose at least one statement first.');
  flashStatus(commitmentStatus, await copyText(text) ? 'Commitment copied.' : 'Copy failed.');
});

document.querySelector('#clear-commitment')?.addEventListener('click', () => {
  commitmentBoxes.forEach((box) => { box.checked = false; });
  if (commitmentPreview) commitmentPreview.textContent = 'Choose one or more statements, then build your commitment.';
  flashStatus(commitmentStatus, 'Commitment cleared.');
  commitmentBoxes[0]?.focus();
});