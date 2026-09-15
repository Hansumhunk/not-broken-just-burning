// V0.3 brand layer: load shared visual identity assets across every page.
const brandStylesheet = document.createElement('link');
brandStylesheet.rel = 'stylesheet';
brandStylesheet.href = 'css/brand.css';
document.head.appendChild(brandStylesheet);

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = 'assets/favicon.svg';
document.head.appendChild(favicon);

const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.site-nav a');
const year = document.querySelector('#year');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open navigation');
    });
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
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -28px 0px'
  });

  revealItems.forEach((item) => observer.observe(item));
}

// The Forge intentionally keeps all entered text in the visitor's browser only.
const forgeThought = document.querySelector('#forge-thought');
const forgeRewrite = document.querySelector('#forge-rewrite');
const forgeFields = document.querySelectorAll('[data-forge]');
const copyForge = document.querySelector('#copy-forge');
const clearForge = document.querySelector('#clear-forge');
const forgeStatus = document.querySelector('#forge-status');

function setForgeStatus(message) {
  if (!forgeStatus) return;
  forgeStatus.textContent = message;
  window.setTimeout(() => {
    if (forgeStatus.textContent === message) forgeStatus.textContent = '';
  }, 3000);
}

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
    'NOT BROKEN JUST BURNING — THE FORGE',
    '',
    `THE THOUGHT\n${forgeThought?.value.trim() || '(blank)'}`,
    ''
  ];

  forgeFields.forEach((field) => {
    sections.push(`${labels[field.dataset.forge]}\n${field.value.trim() || '(blank)'}`, '');
  });

  sections.push(
    'SIX SACRED QUESTIONS',
    'Who? What? When? Where? Why? How?',
    '',
    `FORGED VERSION\n${forgeRewrite?.value.trim() || '(blank)'}`,
    '',
    'Reflection tool only. Not medical, mental-health, legal, or emergency advice.'
  );

  return sections.join('\n');
}

if (copyForge) {
  copyForge.addEventListener('click', async () => {
    const notes = buildForgeNotes();
    try {
      await navigator.clipboard.writeText(notes);
      setForgeStatus('Copied to clipboard.');
    } catch (error) {
      const helper = document.createElement('textarea');
      helper.value = notes;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      setForgeStatus('Copied to clipboard.');
    }
  });
}

if (clearForge) {
  clearForge.addEventListener('click', () => {
    if (forgeThought) forgeThought.value = '';
    if (forgeRewrite) forgeRewrite.value = '';
    forgeFields.forEach((field) => { field.value = ''; });
    setForgeStatus('Forge cleared.');
    forgeThought?.focus();
  });
}
