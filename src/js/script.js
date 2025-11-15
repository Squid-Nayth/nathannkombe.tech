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
let __userInteracted = false; // becomes true after first real user gesture (pointerdown/touchstart/keydown)
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
    try { window.__lastFaceIdAudio = audio; } catch (e) { /* ignore */ }
    // Do not attempt to play until the user has interacted with the document.
    if (!__userInteracted) {
      __faceidSoundQueued = true;
      return audio;
    }
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.warn('Unable to play FaceID sound:', err);
        __faceidSoundQueued = true;
      });
    }
    return audio;
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

// Background music: looped track that should start after FaceID + apple-pay
const __bgMusicSrc = encodeURI('public/sounds/Yi Nantiro - Blue Lantern (Royalty Free Music).mp3');
let __bgAudio = null;
let __bgMusicQueued = false;
function _createBgAudio() {
  if (__bgAudio) return __bgAudio;
  try {
    __bgAudio = new Audio(__bgMusicSrc);
    __bgAudio.preload = 'auto';
    __bgAudio.loop = true;
    __bgAudio.volume = 0.28;
    try { __bgAudio.load(); } catch (e) {}
  } catch (e) {
    console.warn('Unable to create background audio', e);
  }
  return __bgAudio;
}

function _startBackgroundMusic() {
  const bg = _createBgAudio();
  if (!bg) return;
  if (__audioUnlocked) {
    const p = bg.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.warn('Background music play blocked:', err);
        __bgMusicQueued = true;
      });
    }
  } else {
    __bgMusicQueued = true;
  }
}

// When FaceID finishes, start background music after the face-id audio ends
document.addEventListener('faceid:done', function () {
  try {
    const startIfReady = function () { try { _startBackgroundMusic(); } catch (e) {} };
    const last = window.__lastFaceIdAudio;
    if (last && typeof last.addEventListener === 'function') {
      if (last.ended) {
        startIfReady();
      } else {
        last.addEventListener('ended', startIfReady, { once: true });
        // fallback: start after 8s if ended never fires
        setTimeout(startIfReady, 8000);
      }
    } else {
      startIfReady();
    }
  } catch (e) { console.warn('Error starting background music after faceid', e); }
});

// Flush queued audio when unlock occurs
function _flushQueuedAudio() {
  try {
    if (__faceidSoundQueued) { __faceidSoundQueued = false; _playFaceIdSound(); }
    if (__bgMusicQueued) { __bgMusicQueued = false; _startBackgroundMusic(); }
  } catch (e) { /* ignore */ }
}

const _origUnlock = _unlockAudioOnce;
_unlockAudioOnce = function () { _origUnlock(); _flushQueuedAudio(); };

// Attach gesture listeners as a fallback to unlock audio on first real user
// interaction (pointerdown/touchstart/keydown). We also call _unlockAudioOnce
// directly from the FaceID mouseenter handler (below) because that event is
// already a user gesture.
function _attachAudioUnlockListeners() {
  function handler() {
    try {
      __userInteracted = true;
      try { _unlockAudioOnce(); } catch (e) {}
      try { _flushQueuedAudio(); } catch (e) {}
    } finally {
      document.removeEventListener('pointerdown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    }
  }
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
  const email = form.querySelector('input[name="email"]');
  const message = form.querySelector('textarea[name="message"]');
  const submitBtn = form.querySelector('.btn-send');
  if (!email || !message || !submitBtn) return;

  // Track whether a field was touched (blur) so we only show native bubbles after blur/submit
  let touchedEmail = false;
  let touchedMessage = false;

  // Utility: update submit button enabled state based on validity
  function updateSubmitState() {
    const okEmail = email.value.trim() !== '' && email.value.includes('@');
    const okMessage = message.value.trim() !== '';
    const enabled = okEmail && okMessage;
    submitBtn.disabled = !enabled;
    submitBtn.setAttribute('aria-disabled', String(!enabled));
  }

  // Per-field validation using native setCustomValidity + reportValidity when requested
  function validateEmail(showBubble) {
    const val = email.value.trim();
    if (val === '') {
      email.setCustomValidity('Veuillez indiquer votre adresse email');
      if (showBubble) email.reportValidity();
      return false;
    }
    if (!val.includes('@')) {
      email.setCustomValidity('Adresse email invalide');
      if (showBubble) email.reportValidity();
      return false;
    }
    email.setCustomValidity('');
    return true;
  }

  function validateMessage(showBubble) {
    const val = message.value.trim();
    if (val === '') {
      message.setCustomValidity('Veuillez saisir un message');
      if (showBubble) message.reportValidity();
      return false;
    }
    message.setCustomValidity('');
    return true;
  }

  // Wire events: input -> live state update (no bubbles), blur -> validate + show bubble if invalid
  email.addEventListener('input', function () { validateEmail(false); updateSubmitState(); });
  message.addEventListener('input', function () { validateMessage(false); updateSubmitState(); });

  email.addEventListener('blur', function () { touchedEmail = true; validateEmail(true); updateSubmitState(); });
  message.addEventListener('blur', function () { touchedMessage = true; validateMessage(true); updateSubmitState(); });

  // Initialize button state
  updateSubmitState();

  form.addEventListener('submit', (e) => {
    // On submit, show browser bubbles for any invalid fields
    const okEmail = validateEmail(true);
    const okMessage = validateMessage(true);
    updateSubmitState();
    if (!okEmail) { e.preventDefault(); email.focus(); return; }
    if (!okMessage) { e.preventDefault(); message.focus(); return; }

    // disable submit while sending
    e.preventDefault();
    submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true');

    // Attempt to send emails via SiteAPI (EmailJS). SiteAPI.sendContactEmails returns a Promise.
    if (window.SiteAPI && typeof window.SiteAPI.sendContactEmails === 'function') {
      window.SiteAPI.sendContactEmails({ name: '', email: email.value.trim(), message: message.value.trim() })
        .then(() => {
          if (confirmation) {
            confirmation.hidden = false;
            confirmation.style.opacity = '0';
            requestAnimationFrame(() => {
              confirmation.style.transition = 'opacity .28s ease'; confirmation.style.opacity = '1';
              try { _playNotifySound(); } catch (e) { /* ignore */ }
            });
          }
          form.reset();
          // reset touched flags and validity
          touchedEmail = false; touchedMessage = false; email.setCustomValidity(''); message.setCustomValidity('');
          updateSubmitState();
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
          submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); updateSubmitState();
        });
    } else {
      // fallback: show confirmation and reset
      if (confirmation) {
        confirmation.hidden = false; confirmation.style.opacity = '0';
        requestAnimationFrame(() => { confirmation.style.transition = 'opacity .28s ease'; confirmation.style.opacity = '1'; });
      }
      form.reset();
      touchedEmail = false; touchedMessage = false; email.setCustomValidity(''); message.setCustomValidity('');
      updateSubmitState();
      setTimeout(() => {
        if (confirmation) {
          confirmation.style.opacity = '0';
          confirmation.addEventListener('transitionend', function handler() {
            confirmation.hidden = true; confirmation.style.transition = ''; confirmation.removeEventListener('transitionend', handler);
          });
        }
      }, 4000);
      submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy');
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

  // On desktop we require at least one user click before hover will trigger the FaceID
  // animation (prevents accidental hover activations). The first pointerdown anywhere
  // on the page enables hover behavior.
  let hoverAllowed = true;
  if (!isTouchDevice) {
    hoverAllowed = false;
    const enableHover = function () { hoverAllowed = true; try { document.removeEventListener('pointerdown', enableHover); } catch (e) {} };
    document.addEventListener('pointerdown', enableHover, { once: true });
  }

  if (isTouchDevice) {
    // Mobile: simple tap to activate (single click/tap triggers the FaceID animation)
    // Update hint text for touch devices
    try {
      const hint = document.querySelector('.faceid-hint');
      if (hint) {
        hint.textContent = 'Toucher pour activer';
        // Make sure the hint is visually revealed on touch devices
        hint.classList.add('is-visible');
        hint.setAttribute('aria-hidden', 'false');
      }
    } catch (e) { /* ignore */ }

    let triggered = false;

    function finishFlow() {
      // play the FaceID sound shortly after the tick animation
      try {
        setTimeout(() => {
          try {
            if (__audioUnlocked) {
              _playFaceIdSound();
            } else {
              __faceidSoundQueued = true;
            }
          } catch (err) { console.warn('Error playing FaceID sound', err); }
        }, dashDuration + 2);
      } catch (e) { /* ignore */ }

      // After the tick animation, fade out the overlay and finish the flow.
      // Keep the .active/.completed classes until the overlay fade completes
      // so the tick animation has time to play.
      setTimeout(() => {
        overlay.classList.add('fade-out');
        const onFadeEnd = (ev) => {
          if (ev.propertyName === 'opacity') {
            overlay.classList.add('hidden');
            overlay.classList.remove('fade-out');
            document.body.classList.remove('overlay-active');
            overlay.removeEventListener('transitionend', onFadeEnd);
            try {
              // cleanup classes only after fade is done
              faceId.classList.remove('active');
              faceId.classList.remove('completed');
              document.documentElement.classList.remove('animations-paused');
              document.dispatchEvent(new CustomEvent('faceid:done'));
            } catch (err) {}
          }
        };
        overlay.addEventListener('transitionend', onFadeEnd);
      }, dashDuration + 80);
    }

    faceId.addEventListener('pointerdown', function (e) {
      if (triggered) return;
      triggered = true;
      try { e.preventDefault(); } catch (err) {}
      faceId.classList.add('active');
      try { _unlockAudioOnce(); } catch (e) {}

      // Match desktop timing: wait `completeDelay` before marking completed
      // so the tick animation and pacing match the desktop experience.
      setTimeout(() => {
        faceId.classList.add('completed');
        // then finish the flow (plays sound + fades overlay)
        finishFlow();
      }, completeDelay);
    });
  } else {
    // Desktop: hover behaviour guarded by first user click (hoverAllowed)
    let desktopTimer = null;
    faceId.addEventListener('mouseenter', function () {
      if (!hoverAllowed) return;
      faceId.classList.add('active');
      // attempt to unlock audio on hover (may succeed if browser treats this as a gesture)
      try { _unlockAudioOnce(); } catch (e) {}
      desktopTimer = setTimeout(() => {
        faceId.classList.add('completed');

        // play FaceID sound shortly after tick animation (match mobile timing)
        try {
          setTimeout(() => {
            try {
              if (__audioUnlocked) {
                _playFaceIdSound();
              } else {
                __faceidSoundQueued = true;
              }
            } catch (err) { console.warn('Error playing FaceID sound', err); }
          }, dashDuration + 2);
        } catch (e) { /* ignore */ }

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

  // Generic safe mouseleave: cancel any pending timers
  faceId.addEventListener('mouseleave', function() {
    try { if (timer) { clearTimeout(timer); timer = null; } } catch (e) {}
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
    '.experience-item:not(.no-reveal)',
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


// Ensure links that navigate away from the current document open in a new tab.
// - skip same-document anchors (hash), mailto: and tel: links.
// - add target="_blank" and rel="noopener noreferrer" for safety.
document.addEventListener('DOMContentLoaded', function () {
  try {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    anchors.forEach(a => {
      try {
        const href = a.getAttribute('href');
        if (!href) return;
        const lower = href.toLowerCase();
        if (lower.startsWith('#')) return; // same-document anchor
        if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return; // skip protocol links

        // Resolve URL relative to current location
        let url;
        try { url = new URL(href, location.href); } catch (e) { return; }

        // If it's the same origin and same pathname (only hash differs) -> treat as internal
        if (url.origin === location.origin && url.pathname === location.pathname) return;

        // Force open in new tab
        a.setAttribute('target', '_blank');

        // Ensure rel includes noopener and noreferrer for security
        const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
        if (!rel.includes('noopener')) rel.push('noopener');
        if (!rel.includes('noreferrer')) rel.push('noreferrer');
        a.setAttribute('rel', rel.join(' '));
      } catch (e) { /* ignore per-link errors */ }
    });
  } catch (e) { console.warn('error enforcing external links _blank', e); }
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

