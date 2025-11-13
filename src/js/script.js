// Typewriter + toggle handler (dynamic)
document.addEventListener('DOMContentLoaded', () => {
  // Typewriter: set --chars and animation duration based on text length
  const el = document.querySelector('.typewriter-name');
  if (el) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const text = el.textContent.trim();
    const len = Math.max(1, text.length);
    el.style.setProperty('--chars', `${len}ch`);
    if (prefersReduced) {
      el.style.width = `${len}ch`;
      el.style.borderRight = 'transparent';
    } else {
      const duration = Math.min(6, Math.max(1.2, len * 0.12));
      el.style.animation = `typing ${duration}s steps(${len}, end) forwards, blink-caret .7s step-end infinite`;
    }
  }

  // Toggle: persist state in localStorage and initialize UI
  const toggle = document.getElementById('emailToggle');
  const KEY = 'email.enabled';
  if (toggle) {
    const saved = localStorage.getItem(KEY);
    const enabled = saved === null ? false : saved === '1';
    toggle.checked = enabled;
    toggle.setAttribute('aria-checked', String(enabled));

    toggle.addEventListener('change', (e) => {
      const on = e.target.checked;
      localStorage.setItem(KEY, on ? '1' : '0');
      toggle.setAttribute('aria-checked', String(on));
      // brief label feedback
      const title = document.querySelector('.contact-title');
      if (title) {
        title.textContent = on ? 'Vous aimez mon travail ? — notifications activées' : 'Vous aimez mon travail ?';
        setTimeout(() => { if (title) title.textContent = 'Vous aimez mon travail ?'; }, 1400);
      }
    });
  }
});
