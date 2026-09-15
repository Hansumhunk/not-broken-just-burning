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
const navLinks = document.querySelectorAll('.site-nav a');
const year = document.querySelector('#year');

if (year) year.textContent = new Date().getFullYear();

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
