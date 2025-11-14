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

// Audio unlock state for FaceID sound playback. We attempt to unlock audio
// on the first user gesture (mouseenter on the FaceID element is considered
// a user interaction) so that playing the confirmation sound later won't be
// blocked by autoplay policies.
let __audioUnlocked = false;
let __faceidSoundQueued = false;
const __faceidSoundSrc = 'public/sounds/apple-pay.mp3';
// Notification sound for successful contact form send
const __notifySoundSrc = 'public/sounds/IPHONE NOTIFICATION SOUND EFFECT (PING_DING).mp3';
let __notifySoundQueued = false;
// Create a persistent Audio instance so the file can be preloaded and played
// instantly when needed.
const __notifyAudio = new Audio(__notifySoundSrc);
__notifyAudio.preload = 'auto';
__notifyAudio.volume = 0.9;
// Force load early so browser can fetch the file (subject to caching/CSP)
try { __notifyAudio.load(); } catch (e) { /* ignore */ }
// Toggle switch sound (play instantly on user toggling notifications)
const __toggleSoundSrc = 'public/sounds/iPhone Lock - Sound Effect (HD).mp3';
let __toggleSoundQueued = false;
const __toggleAudio = new Audio(__toggleSoundSrc);
__toggleAudio.preload = 'auto';
__toggleAudio.volume = 0.9;
try { __toggleAudio.load(); } catch (e) { /* ignore */ }

function _playNotifySound() {
  try {
    // Play the preloaded audio instance for lowest latency.
    try {
      __notifyAudio.currentTime = 0;
    } catch (e) { /* ignore if not seekable */ }
    const p = __notifyAudio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.warn('Unable to play notification sound immediately:', err);
        __notifySoundQueued = true;
      });
    }
  } catch (e) {
    console.warn('Notification sound error', e);
  }
}

function _playToggleSound() {
  try {
    try { __toggleAudio.currentTime = 0; } catch (e) {}
    const p = __toggleAudio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.warn('Unable to play toggle sound immediately:', err);
        __toggleSoundQueued = true;
      });
    }
  } catch (e) { console.warn('Toggle sound error', e); }
}

function _playFaceIdSound() {
  try {
    const audio = new Audio(__faceidSoundSrc);
    audio.volume = 0.9;
    audio.play().catch((err) => {
      console.warn('Unable to play FaceID sound:', err);
      // If playback is blocked, queue it for the next user gesture
      __faceidSoundQueued = true;
    });
  } catch (e) {
    console.warn('FaceID sound error', e);
  }
}

function _unlockAudioOnce() {
  if (__audioUnlocked) return;
  try {
    const a = new Audio(__faceidSoundSrc);
    a.muted = true;
    const p = a.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        try { a.pause(); a.currentTime = 0; } catch (e) {}
        __audioUnlocked = true;
        if (__faceidSoundQueued) { __faceidSoundQueued = false; _playFaceIdSound(); }
      }).catch((err) => {
        console.warn('Audio unlock attempt failed:', err);
      });
    } else {
      try { a.pause(); a.currentTime = 0; } catch (e) {}
      __audioUnlocked = true;
      if (__faceidSoundQueued) { __faceidSoundQueued = false; _playFaceIdSound(); }
    }
  } catch (e) {
    console.warn('Audio unlock setup error', e);
  }
}

// Attach gesture listeners as a fallback to unlock audio on first real user
// interaction (pointerdown/touchstart/keydown). We also call _unlockAudioOnce
// directly from the FaceID mouseenter handler (below) because that event is
// already a user gesture.
function _attachAudioUnlockListeners() {
  function handler() { try { _unlockAudioOnce(); } finally {
      document.removeEventListener('pointerdown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    }}
  document.addEventListener('pointerdown', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}
_attachAudioUnlockListeners();

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
    // Prevent double-play: when we play the sound on pointerdown/keydown we set
    // a small flag so the change handler won't re-trigger it.
    let __toggleSoundPlayed = false;
    function markToggleSoundPlayed() {
      __toggleSoundPlayed = true;
      setTimeout(() => { __toggleSoundPlayed = false; }, 600);
    }

    // Play on immediate user press (pointerdown/touchstart) for lowest latency.
    toggle.addEventListener('pointerdown', (e) => {
      try { _playToggleSound(); markToggleSoundPlayed(); } catch (err) {}
    });
    // Also support keyboard activation (Space / Enter)
    toggle.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        try { _playToggleSound(); markToggleSoundPlayed(); } catch (err) {}
      }
    });

    // The change handler persists the state and provides UI feedback. It will
    // only play the sound if it wasn't already played on pointerdown/keydown.
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
      if (!__toggleSoundPlayed) {
        try { _playToggleSound(); } catch (err) {}
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
    const submitBtn = form.querySelector('.btn-send');
    if (!email || !message) return;
    if (!email.value.trim() || !message.value.trim()) {
      // focus the first empty field
      if (!email.value.trim()) email.focus(); else message.focus();
      return;
    }

    // disable submit while sending
    if (submitBtn) { submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true'); }

    // Attempt to send emails via SiteAPI (EmailJS). SiteAPI.sendContactEmails returns a Promise.
    if (window.SiteAPI && typeof window.SiteAPI.sendContactEmails === 'function') {
      window.SiteAPI.sendContactEmails({ name: '', email: email.value.trim(), message: message.value.trim() })
        .then(() => {
          // show confirmation
          if (confirmation) {
            confirmation.hidden = false;
            confirmation.style.opacity = '0';
            requestAnimationFrame(() => {
              confirmation.style.transition = 'opacity .28s ease';
              confirmation.style.opacity = '1';
              try { _playNotifySound(); } catch (e) { /* ignore */ }
            });
          }

          // reset form after successful send
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
        })
        .catch((err) => {
          console.error('Send contact emails error:', err);
          alert('Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.');
        })
        .finally(() => {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); }
        });
    } else {
      // fallback: if SiteAPI not available, show confirmation and reset (best-effort)
      if (confirmation) {
        confirmation.hidden = false;
        confirmation.style.opacity = '0';
        requestAnimationFrame(() => { confirmation.style.transition = 'opacity .28s ease'; confirmation.style.opacity = '1'; });
      }
      form.reset();
      setTimeout(() => {
        if (confirmation) {
          confirmation.style.opacity = '0';
          confirmation.addEventListener('transitionend', function handler() {
            confirmation.hidden = true; confirmation.style.transition = ''; confirmation.removeEventListener('transitionend', handler);
          });
        }
      }, 4000);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); }
    }
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
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

  if (isTouchDevice) {
    // Mobile: use pointer events for robust press-and-hold detection (pointerdown -> pointerup).
    let holdTimer = null;
    let activePointerId = null;

    function cancelHold() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      faceId.classList.remove('active');
      faceId.classList.remove('completed');
      activePointerId = null;
    }

    function finishFlow() {
      // play the FaceID sound immediately after the tick animation finishes (+2ms)
      try {
        setTimeout(() => {
          try {
            if (__audioUnlocked) {
              _playFaceIdSound();
            } else {
              // if not unlocked yet, queue for next gesture
              __faceidSoundQueued = true;
            }
          } catch (err) { console.warn('Error playing FaceID sound', err); }
        }, dashDuration + 2);
      } catch (e) { /* ignore */ }

      // After the tick animation, wait a bit then fade out the overlay and finish the flow
      setTimeout(() => {
        overlay.classList.add('fade-out');
        const onFadeEnd = (ev) => {
          if (ev.propertyName === 'opacity') {
            overlay.classList.add('hidden');
            overlay.classList.remove('fade-out');
            document.body.classList.remove('overlay-active');
            overlay.removeEventListener('transitionend', onFadeEnd);
            try {
              document.documentElement.classList.remove('animations-paused');
              document.dispatchEvent(new CustomEvent('faceid:done'));
            } catch (err) {}
          }
        };
        overlay.addEventListener('transitionend', onFadeEnd);
      }, dashDuration + 80);

      // cleanup classes
      faceId.classList.remove('active');
      faceId.classList.remove('completed');
    }

    function startHold(pointerId) {
      activePointerId = pointerId;
      faceId.classList.add('active');
      try { _unlockAudioOnce(); } catch (e) {}
      holdTimer = setTimeout(() => {
        // mark completed (trigger tick animation)
        faceId.classList.add('completed');
        // then run the finish flow which plays sound and fades overlay
        finishFlow();
      }, completeDelay);
    }

    function onPointerDown(e) {
      // Only start if the target is the faceId element (or its children)
      // prevent default to avoid weird scroll/gesture interactions
      try { e.preventDefault(); } catch (err) {}
      startHold(e.pointerId);
    }

    function onPointerUp(e) {
      if (activePointerId === null) return;
      if (e.pointerId === activePointerId) cancelHold();
    }

    faceId.addEventListener('pointerdown', onPointerDown);
    // listen on the document to catch pointerup even if the pointer leaves the element
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  } else {
    // Desktop: preserve hover behaviour, no audio
    let desktopTimer = null;
    faceId.addEventListener('mouseenter', function () {
      faceId.classList.add('active');
      desktopTimer = setTimeout(() => {
        faceId.classList.add('completed');
        setTimeout(() => {
          overlay.classList.add('fade-out');
          const onFadeEnd = (e) => {
            if (e.propertyName === 'opacity') {
              overlay.classList.add('hidden');
              overlay.classList.remove('fade-out');
              document.body.classList.remove('overlay-active');
              overlay.removeEventListener('transitionend', onFadeEnd);
              try {
                document.documentElement.classList.remove('animations-paused');
                document.dispatchEvent(new CustomEvent('faceid:done'));
              } catch (err) {}
            }
          };
          overlay.addEventListener('transitionend', onFadeEnd);
        }, dashDuration + 80);
      }, completeDelay);
    });
    faceId.addEventListener('mouseleave', function () {
      if (desktopTimer) { clearTimeout(desktopTimer); desktopTimer = null; }
      faceId.classList.remove('active');
      faceId.classList.remove('completed');
    });
  }

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


// PushAlert: execute the exact PushAlert IIFE only when the user enables the toggle
document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('emailToggle');
  if (!toggle) return;

  // keep default off unless previously saved
  try {
    const saved = localStorage.getItem('email.enabled');
    if (saved === null) { toggle.checked = false; toggle.setAttribute('aria-checked', 'false'); }
  } catch (e) { /* ignore storage errors */ }

  toggle.addEventListener('change', function (e) {
    if (e.target.checked) {
      // if already injected, do nothing
      if (document.getElementById('pushalert-exec')) return;

      // create a script element whose content is the exact IIFE from your snippet
      const s = document.createElement('script');
      s.id = 'pushalert-exec';
      s.type = 'text/javascript';
      s.text = `(function(d, t) {
                var g = d.createElement(t),
                s = d.getElementsByTagName(t)[0];
                g.src = "https://cdn.pushalert.co/integrate_413c09932cbafd37bfe7e33cc8beb1ad.js";
                s.parentNode.insertBefore(g, s);
        }(document, "script"));`;

      const ref = document.getElementsByTagName('script')[0];
      if (ref && ref.parentNode) ref.parentNode.insertBefore(s, ref);
      else document.head.appendChild(s);
    } else if (!e.target.checked) {
      // remove injected script if present
      const existing = document.getElementById('pushalert-exec');
      if (existing) existing.remove();
      // note: unsubscribing at provider side is not handled here
    } else {
      // fallback: do nothing
    }
  });
});

// Mobile nav toggle: open/close the slide-in sidebar on small screens
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('mobileNavToggle');
  var sidebar = document.getElementById('mobileSidebar');
  var backdrop = document.getElementById('mobileNavBackdrop');
  if (!toggle || !sidebar || !backdrop) return;

  function openNav() {
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('open');
    backdrop.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    // lock scroll
    document.documentElement.style.overflow = 'hidden';
    // move focus into sidebar
    var firstLink = sidebar.querySelector('a'); if (firstLink) firstLink.focus();
  }

  function closeNav() {
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('open');
    backdrop.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    toggle.focus();
  }

  toggle.addEventListener('click', function (e) {
    var open = sidebar.classList.contains('open');
    if (open) closeNav(); else openNav();
  });

  backdrop.addEventListener('click', function () { closeNav(); });

  // close on ESC
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && sidebar.classList.contains('open')) closeNav();
  });

  // close when navigating a link
  sidebar.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { closeNav(); });
  });
});

