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

  // Video logic removed — intro uses a static image instead
});

// Contact form handling: show a confirmation message on submit (client-side)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  const confirmation = document.querySelector('.contact-confirmation');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Simple client-side validation
    const email = form.querySelector('input[name="email"]');
    const message = form.querySelector('textarea[name="message"]');
    if (!email || !message) return;
    if (!email.value.trim() || !message.value.trim()) {
      // focus the first empty field
      if (!email.value.trim()) email.focus(); else message.focus();
      return;
    }

    // show confirmation
    if (confirmation) {
      confirmation.hidden = false;
      confirmation.style.opacity = '0';
      // fade in
      requestAnimationFrame(() => { confirmation.style.transition = 'opacity .28s ease'; confirmation.style.opacity = '1'; });
    }

    // reset form after submit
    form.reset();

    // hide confirmation after 4s
    setTimeout(() => {
      if (confirmation) {
        confirmation.style.opacity = '0';
        confirmation.addEventListener('transitionend', function handler() {
          confirmation.hidden = true; confirmation.style.transition = ''; confirmation.removeEventListener('transitionend', handler);
        });
      }
    }, 4000);
  });
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
    // audio logic intentionally removed
    // schedule completed state if user stays
    timer = setTimeout(() => {
      this.classList.add('completed');

      // once completed, start overlay fade-out (iOS-like) then hide after transition
      setTimeout(() => {
        // start fade-out animation
        overlay.classList.add('fade-out');

        const onFadeEnd = (e) => {
          // wait for opacity transition to finish
          if (e.propertyName === 'opacity') {
            overlay.classList.add('hidden');
            overlay.classList.remove('fade-out');
            document.body.classList.remove('overlay-active');
            overlay.removeEventListener('transitionend', onFadeEnd);
          }
        };
        overlay.addEventListener('transitionend', onFadeEnd);
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

/* Reveal-on-scroll: add .reveal-on-scroll to main blocks and observe them */
document.addEventListener('DOMContentLoaded', () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // choose selectors to reveal (sections and some key components)
  const selectors = [
    'section',
    '.project-card',
    '.experience-item',
    '.carousel-section',
    '.github-calendar-card',
    '.intro-left',
    '.intro-right',
    '.contact-form',
    '.projects-grid',
  ].join(', ');

  const nodes = Array.from(document.querySelectorAll(selectors));

  // attach class so CSS hides them initially
  nodes.forEach((n, i) => {
    // don't re-add if already present
    if (!n.classList.contains('reveal-on-scroll')) {
      n.classList.add('reveal-on-scroll');
      // small stagger for visible sequence
      const delay = Math.min(0.18 * (i % 6), 0.6);
      n.style.setProperty('--reveal-delay', `${delay}s`);
      n.setAttribute('data-delay', String(delay));
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // if we want to reveal only once
        observer.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  nodes.forEach(n => observer.observe(n));
});
