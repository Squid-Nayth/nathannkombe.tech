// Dynamic helper to adjust the CSS-only typewriter animation to the actual name length
// and a small handler for the email-send toggle switch.
document.addEventListener('DOMContentLoaded', () => {
  // --- Typewriter setup ---
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

  // --- Toggle switch for email sending ---
  const toggle = document.getElementById('emailToggle');
  const STORAGE_KEY = 'email.enabled';
  if (toggle) {
    // Initialize from localStorage (default: true)
    const saved = localStorage.getItem(STORAGE_KEY);
    const enabled = saved === null ? true : saved === '1';
    toggle.checked = enabled;
    toggle.setAttribute('aria-checked', String(enabled));

    toggle.addEventListener('change', (e) => {
      const on = e.target.checked;
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
      toggle.setAttribute('aria-checked', String(on));
      // Optional: show a small feedback (temporary)
      const label = document.querySelector('.switch-label strong');
      if (label) {
        label.textContent = on ? "Envoi d'e-mails activé" : "Envoi d'e-mails désactivé";
        setTimeout(() => { if (label) label.textContent = "Envoi d'e-mails"; }, 1400);
      }
    });
  }
});
