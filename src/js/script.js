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


/* ------------------------------------------------------------------
   OneSignal toggle integration
   - Links the #emailToggle switch to the OneSignal SDK so users can
     enable/disable push notifications via the UI.
 ------------------------------------------------------------------ */
(function () {
  const toggle = document.getElementById('emailToggle');
  if (!toggle) return;

  function setToggleUI(checked) {
    toggle.checked = !!checked;
    toggle.setAttribute('aria-checked', checked ? 'true' : 'false');
    document.body.classList.toggle('notifications-enabled', !!checked);
    try { localStorage.setItem('email.notify', checked ? '1' : '0'); } catch (e) {}
  }

  // Ensure callback runs when OneSignal is available. Supports OneSignal.push and OneSignalDeferred patterns.
  function whenOneSignalReady(cb) {
    if (window.OneSignal && typeof window.OneSignal.push === 'function') {
      window.OneSignal.push(() => cb(window.OneSignal));
      return;
    }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(cb);
  }

  // Initialize toggle state from OneSignal
  whenOneSignalReady(async (OneSignal) => {
    try {
      const enabled = await OneSignal.isPushNotificationsEnabled();
      setToggleUI(enabled);
    } catch (err) {
      console.warn('OneSignal: unable to read subscription state', err);
      // fallback to localStorage value
      try {
        const saved = localStorage.getItem('email.notify');
        setToggleUI(saved === '1');
      } catch (e) { setToggleUI(false); }
    }
  });

  // Handle user toggling the switch
  toggle.addEventListener('change', (e) => {
    const wantOn = !!e.target.checked;
    // optimistic UI
    setToggleUI(wantOn);

    whenOneSignalReady(async (OneSignal) => {
      try {
        if (wantOn) {
          const already = await OneSignal.isPushNotificationsEnabled();
          if (!already) {
            // This will show the permission prompt and register the user
            await OneSignal.registerForPushNotifications();
          }
          await OneSignal.setSubscription(true);
        } else {
          await OneSignal.setSubscription(false);
        }
      } catch (err) {
        console.error('OneSignal toggle error', err);
        // revert UI on error
        setToggleUI(!wantOn);
      }
    });
  });
})();

// OneSignal integration removed. The site retains a simple local toggle handler
// (which persists `email.enabled` in localStorage) for lightweight UI feedback.

/* ------------------------------------------------------------------
   PushAlert dynamic loader tied to the #emailToggle
   - Loads PushAlert script only when user enables the toggle.
   - Attempts best-effort unsubscribe/unregister when user disables it.
 ------------------------------------------------------------------ */
(function () {
  const TOGGLE_ID = 'emailToggle';
  const STORAGE_KEY = 'email.enabled'; // reuse existing key used elsewhere in script
  const SCRIPT_ID = 'pushalert-inject';
  const SCRIPT_SRC = 'https://cdn.pushalert.co/integrate_413c09932cbafd37bfe7e33cc8beb1ad.js';

  function setToggleUI(checked) {
    const t = document.getElementById(TOGGLE_ID);
    if (!t) return;
    t.checked = !!checked;
    t.setAttribute('aria-checked', checked ? 'true' : 'false');
    document.body.classList.toggle('notifications-enabled', !!checked);
  }

  function injectPushAlertScript() {
    if (document.getElementById(SCRIPT_ID)) return;
    const g = document.createElement('script');
    g.id = SCRIPT_ID;
    g.type = 'text/javascript';
    g.async = true;
    g.src = SCRIPT_SRC;
    const s = document.getElementsByTagName('script')[0];
    if (s && s.parentNode) s.parentNode.insertBefore(g, s);
    else document.head.appendChild(g);
  }

  async function removePushAlertScriptAndSW() {
    // remove injected script tag
    const el = document.getElementById(SCRIPT_ID);
    if (el) el.remove();

    // best-effort: call unsubscribe if PushAlert exposes it
    try {
      if (window.PushAlert && typeof window.PushAlert.unsubscribe === 'function') {
        window.PushAlert.unsubscribe();
      }
    } catch (e) { /* ignore */ }

    // unregister service workers that look like PushAlert's
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try {
            const url = (r && r.active && r.active.scriptURL) || '';
            if (url && url.includes('pushalert')) {
              await r.unregister();
            }
          } catch (e) { /* ignore per-reg errors */ }
        }
      } catch (e) { /* ignore */ }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) return;

    // initialize state from localStorage (default: disabled)
    const saved = localStorage.getItem(STORAGE_KEY);
    const enabled = saved === '1';
    setToggleUI(enabled);

    // if previously enabled, inject on load
    if (enabled) injectPushAlertScript();

    toggle.addEventListener('change', async (e) => {
      const wantOn = !!e.target.checked;
      setToggleUI(wantOn);

      if (wantOn) {
        injectPushAlertScript();
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (err) { /* ignore */ }
      } else {
        await removePushAlertScriptAndSW();
        try { localStorage.setItem(STORAGE_KEY, '0'); } catch (err) { /* ignore */ }
      }
    });
  });
})();

