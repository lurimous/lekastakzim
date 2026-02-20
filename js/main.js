/**
 * main.js — Lekas Takzim Sdn. Bhd.
 * Dynamic section loader with fade transitions, scroll-triggered nav,
 * scroll-reveal animations, mobile menu, and contact form handling.
 */

(function () {
  'use strict';

  /* ─── Configuration ─────────────────────────────────────── */
  var CONFIG = {
    sectionPath:     'sections/',
    defaultSection:  'home',
    fadeDuration:    400,       // ms — matches CSS --dur-content
    scrollThreshold: 80,        // px before nav goes solid
    revealThreshold: 0.12,
    revealMargin:    '0px 0px -60px 0px',
  };

  /* ─── State ─────────────────────────────────────────────── */
  var currentSection  = null;
  var isTransitioning = false;

  /* ─── DOM References ────────────────────────────────────── */
  var content    = document.getElementById('content');
  var nav        = document.getElementById('nav');
  var hamburger  = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  var footerYear = document.getElementById('footer-year');

  /* ─── Reveal Observer (module-level, recreated per section) */
  var revealObserver = null;

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function init() {
    // Footer year
    if (footerYear) {
      footerYear.textContent = new Date().getFullYear();
    }

    // Determine initial section from URL hash
    var hash = window.location.hash.replace('#', '');
    var initialSection = hash || CONFIG.defaultSection;

    // Load initial section without pushing state
    loadSection(initialSection, { pushState: false, initial: true });

    // Nav scroll behaviour
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Desktop nav and footer link clicks
    bindNavLinks(document);

    // Mobile hamburger
    hamburger.addEventListener('click', toggleMobileMenu);

    // Browser back / forward
    window.addEventListener('popstate', onPopState);
  }

  /* ═══════════════════════════════════════════════════════════
     SECTION LOADING
  ═══════════════════════════════════════════════════════════ */

  /**
   * Fetches a section HTML file and injects it into #content.
   * @param {string}  section  - e.g. 'home', 'about'
   * @param {object}  [opts]
   * @param {boolean} [opts.pushState=true]  - push to History API
   * @param {boolean} [opts.initial=false]   - suppress transition on first load
   */
  function loadSection(section, opts) {
    opts = opts || {};
    var pushState = opts.pushState !== false;
    var initial   = !!opts.initial;

    if (section === currentSection && !initial) return;
    if (isTransitioning) return;

    isTransitioning = true;

    var url = CONFIG.sectionPath + section + '.html';

    // Fade out
    content.classList.add('is-fading');

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        // Wait for CSS fade-out, then swap
        var delay = initial ? 0 : CONFIG.fadeDuration;
        setTimeout(function () {
          // Inject HTML
          content.innerHTML = html;

          // Update state
          currentSection = section;

          // History API
          if (pushState) {
            history.pushState({ section: section }, '', '#' + section);
          }

          // Update active nav indicator
          updateActiveNav(section);

          // Post-inject hooks
          afterSectionLoad(section);

          // Fade in
          content.classList.remove('is-fading');
          isTransitioning = false;

          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, delay);
      })
      .catch(function (err) {
        console.error('[LT] Section load failed:', err);
        content.innerHTML = [
          '<div style="min-height:60vh;display:flex;flex-direction:column;',
          'align-items:center;justify-content:center;gap:1rem;',
          'color:var(--color-text-muted);padding:4rem 2rem;text-align:center;">',
          '<p style="font-size:var(--text-lg);">Content could not be loaded.</p>',
          '<p style="font-size:var(--text-sm);">Please refresh the page or try again.</p>',
          '</div>',
        ].join('');
        content.classList.remove('is-fading');
        isTransitioning = false;
      });
  }

  /**
   * Runs after new section HTML is injected into #content.
   */
  function afterSectionLoad(section) {
    // Bind nav links inside the newly loaded content
    bindNavLinks(content);

    // Reinitialise scroll-reveal
    initReveal();

    // Reveal elements already in viewport
    revealAboveFold();

    // Section-specific logic
    if (section === 'contact') {
      initContactForm();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION
  ═══════════════════════════════════════════════════════════ */

  /**
   * Binds click handlers on all [data-section] elements within `root`.
   */
  function bindNavLinks(root) {
    var els = root.querySelectorAll('[data-section]');
    els.forEach(function (el) {
      // Avoid duplicate listeners
      el.removeEventListener('click', onNavClick);
      el.addEventListener('click', onNavClick);
    });
  }

  function onNavClick(e) {
    var section = e.currentTarget.getAttribute('data-section');
    if (!section) return;

    // Close mobile menu if open
    if (mobileMenu.classList.contains('is-open')) {
      toggleMobileMenu();
    }

    loadSection(section, { pushState: true });
  }

  function updateActiveNav(section) {
    document.querySelectorAll('.nav__link').forEach(function (link) {
      var active = link.getAttribute('data-section') === section;
      link.classList.toggle('nav__link--active', active);
      link.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function onPopState(e) {
    var section = (e.state && e.state.section) ? e.state.section : CONFIG.defaultSection;
    loadSection(section, { pushState: false });
  }

  /* ═══════════════════════════════════════════════════════════
     SCROLL → NAV SOLID
  ═══════════════════════════════════════════════════════════ */
  function onScroll() {
    nav.classList.toggle('nav--solid', window.scrollY > CONFIG.scrollThreshold);
  }

  /* ═══════════════════════════════════════════════════════════
     MOBILE MENU
  ═══════════════════════════════════════════════════════════ */
  function toggleMobileMenu() {
    var open = mobileMenu.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(open));

    var bars = hamburger.querySelectorAll('span');
    if (open) {
      bars[0].style.transform = 'translateY(6.5px) rotate(45deg)';
      bars[1].style.opacity   = '0';
      bars[2].style.transform = 'translateY(-6.5px) rotate(-45deg)';
      document.body.style.overflow = 'hidden';
    } else {
      bars[0].style.transform = '';
      bars[1].style.opacity   = '';
      bars[2].style.transform = '';
      document.body.style.overflow = '';
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SCROLL REVEAL (IntersectionObserver)
  ═══════════════════════════════════════════════════════════ */
  function initReveal() {
    if (revealObserver) {
      revealObserver.disconnect();
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold:  CONFIG.revealThreshold,
      rootMargin: CONFIG.revealMargin,
    });

    content.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  function revealAboveFold() {
    var vh = window.innerHeight;
    content.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < vh) {
        el.classList.add('is-visible');
        if (revealObserver) revealObserver.unobserve(el);
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     CONTACT FORM
  ═══════════════════════════════════════════════════════════ */
  var CONTACT_EMAIL = 'admin@lekastakzim.asia';

  function initContactForm() {
    var form      = document.getElementById('contactForm');
    var btnSubmit = document.getElementById('submitBtn');
    var elSuccess = document.getElementById('formSuccess');
    var elError   = document.getElementById('formError');

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      elSuccess.classList.remove('is-visible');
      elError.classList.remove('is-visible');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var name    = (document.getElementById('field-name')    || {}).value || '';
      var email   = (document.getElementById('field-email')   || {}).value || '';
      var phone   = (document.getElementById('field-phone')   || {}).value || '';
      var company = (document.getElementById('field-company') || {}).value || '';
      var message = (document.getElementById('field-message') || {}).value || '';

      var subject = 'Enquiry' + (name ? ' from ' + name : '') + (company ? ' (' + company + ')' : '');

      var body = [
        'Name: '    + name,
        'Email: '   + email,
        'Phone: '   + (phone   || '—'),
        'Company: ' + (company || '—'),
        '',
        message,
      ].join('\n');

      var mailto = 'mailto:' + CONTACT_EMAIL
        + '?subject=' + encodeURIComponent(subject)
        + '&body='    + encodeURIComponent(body);

      window.location.href = mailto;

      // Show confirmation and reset after a brief delay
      setTimeout(function () {
        form.reset();
        elSuccess.classList.add('is-visible');
      }, 400);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     BOOTSTRAP
  ═══════════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
