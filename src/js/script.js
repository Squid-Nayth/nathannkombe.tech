// Consolidated script: gate site animations behind the Face ID flow so no
// animations (carousels, hero popper, typewriter, reveal-on-scroll) start
// until the face-id interaction completes.

// Add a flag to pause CSS animations site-wide. This runs as the script is
// parsed (defer scripts run before DOMContentLoaded) so CSS rules can target
// the presence of this class and pause animations.
document.documentElement.classList.add('animations-paused');

// Global speed factor for non-button animations. Increase to slow animations
// slightly. Buttons keep their original timings.
const __ANIM_SPEED_FACTOR = 1.3;

function runAfterFaceID(fn) {
  if (!document.documentElement.classList.contains('animations-paused')) {
    fn();
  } else {
    document.addEventListener('faceid:done', fn, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Typewriter: compute and set --chars now; only start the CSS animation after FaceID
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
      // start animation only after face-id finishes
      runAfterFaceID(() => {
        const base = Math.min(6, Math.max(1.2, len * 0.12));
        const duration = Math.min(6 * __ANIM_SPEED_FACTOR, Math.max(1.2 * __ANIM_SPEED_FACTOR, base * __ANIM_SPEED_FACTOR));
        el.style.animation = `typing ${duration}s steps(${len}, end) forwards, blink-caret ${0.7 * __ANIM_SPEED_FACTOR}s step-end infinite`;
      });
    }
  }

  // Toggle: persist state in localStorage and initialize UI (no animation)
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

            // resume animations site-wide and notify waiting code
            try {
              document.documentElement.classList.remove('animations-paused');
              document.dispatchEvent(new CustomEvent('faceid:done'));
            } catch (err) {
              // swallow any error — non-critical
            }
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

/* Reveal-on-scroll: prepare elements now, but start observing only after FaceID
   completes so the entrance animations won't run until the overlay is done. */
function initRevealOnScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
  nodes.forEach((n, i) => {
    if (!n.classList.contains('reveal-on-scroll')) {
      n.classList.add('reveal-on-scroll');
      const delay = Math.min(0.18 * (i % 6) * __ANIM_SPEED_FACTOR, 0.6 * __ANIM_SPEED_FACTOR);
      n.style.setProperty('--reveal-delay', `${delay}s`);
      n.setAttribute('data-delay', String(delay));
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  nodes.forEach(n => observer.observe(n));
}

// Hero word popper: only run after FaceID
function initHeroPopper() {
  const heading = document.querySelector('.hero-heading');
  const cta = document.querySelector('.contact-cta');
  if (!heading) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (cta) cta.classList.add('is-visible');
    return;
  }

  const originalNodes = Array.from(heading.childNodes);
  const wordSpans = [];
  heading.innerHTML = '';

  originalNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      parts.forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) {
          heading.appendChild(document.createTextNode(p));
        } else {
          const span = document.createElement('span');
          span.className = 'hero-word';
          span.textContent = p;
          heading.appendChild(span);
          wordSpans.push(span);
        }
      });
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
      heading.appendChild(document.createElement('br'));
    } else {
      heading.appendChild(node.cloneNode(true));
    }
  });

  const perWordMs = Math.round(110 * __ANIM_SPEED_FACTOR);
  wordSpans.forEach((ws, i) => {
    setTimeout(() => { ws.classList.add('is-visible'); }, i * perWordMs);
  });

  if (cta && wordSpans.length) {
  const total = wordSpans.length * perWordMs + Math.round(220 * __ANIM_SPEED_FACTOR);
    setTimeout(() => { cta.classList.add('is-visible'); }, total);
  } else if (cta) {
    cta.classList.add('is-visible');
  }
}

// Start reveal and hero popper after FaceID or immediately if already done
runAfterFaceID(() => {
  initRevealOnScroll();
  initHeroPopper();
});

// Note: hero scroll hint removed — no smooth-scroll handlers required.

// Custom smooth scroll for internal anchors to position the target heading
// just below the fixed navbar so the title is visible while the section
// content remains below the fold. This provides a consistent offset.
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.site-nav');
  const navHeight = nav ? nav.offsetHeight : 64;
  const extraGap = 12; // px gap between navbar bottom and the title

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (ev) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return; // ignore empty anchors
      // only handle same-document hashes
      if (href.startsWith('#')) {
        const target = document.querySelector(href);
        if (!target) return; // nothing to scroll to
        ev.preventDefault();

        const targetTop = window.scrollY + target.getBoundingClientRect().top;
        const scrollTo = Math.max(0, targetTop - navHeight - extraGap);
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
      }
    });
  });
});

