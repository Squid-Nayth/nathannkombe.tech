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

/* Face ID intro: show overlay at load, then wait for user's hover to complete animation
   Behavior: overlay visible on load (page blurred). When user mouseenters the face,
   add 'active' and after 1700ms add 'completed' (then hide overlay). On mouseleave,
   cancel pending timer and remove classes (animation won't complete).
*/
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.querySelector('.faceid-overlay');
  const faceId = document.querySelector('.face-id-wrapper');
  if (!overlay || !faceId) return;

  // show overlay and blur background until user completes the interaction
  overlay.classList.remove('hidden');
  document.body.classList.add('overlay-active');

  let timer = null;
  const completeDelay = 1700; // ms
  const dashDuration = 600; // ms (tick animation)

  faceId.addEventListener('mouseenter', function() {
    // start the activation
    this.classList.add('active');
    // schedule completed state if user stays
    timer = setTimeout(() => {
      this.classList.add('completed');
      // once completed, hide overlay after dash animation finishes
      setTimeout(() => {
        overlay.classList.add('hidden');
        document.body.classList.remove('overlay-active');
      }, dashDuration + 80);
    }, completeDelay);
  });

  faceId.addEventListener('mouseleave', function() {
    // cancel completion if user leaves early
    if (timer) { clearTimeout(timer); timer = null; }
    this.classList.remove('active');
    this.classList.remove('completed');
  });
});
