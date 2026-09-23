/* ==========================================================================
   spanani.de — shared site behavior
   Loaded with `defer` on every page. No dependencies, no modules, ES5-safe.
   Everything is opt-in via data attributes, so pages stay markup-only.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------------------------------------------------- */

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /** Normalizes "/services/index.html", "/services/", "/services" -> "/services" */
  function normalizePath(path) {
    if (!path) return '/';
    var p = path.replace(/index\.html$/, '');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  /* ---------- 1. nav: current-page highlight ------------------------------ */

  function markCurrentNavLink() {
    var here = normalizePath(window.location.pathname);
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var target = normalizePath(link.getAttribute('href') || '');
      if (target === here) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('is-current');
        link.removeAttribute('aria-current');
      }
    }
  }

  /* ---------- 2. nav: shadow after 8px of scroll -------------------------- */

  function initScrolledNav() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var ticking = false;

    function apply() {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
  }

  /* ---------- 3. clock pills --------------------------------------------- */

  function initClocks() {
    var utcEls = document.querySelectorAll('[data-utc-clock]');
    var localEls = document.querySelectorAll('[data-local-clock]');
    if (!utcEls.length && !localEls.length) return;

    function tick() {
      var now = new Date();
      var utc = pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds()) + ' UTC';
      var local = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      var i;
      for (i = 0; i < utcEls.length; i++) utcEls[i].textContent = utc;
      for (i = 0; i < localEls.length; i++) localEls[i].textContent = local;
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 4. clipboard copy + toast ----------------------------------- */

  var toastTimer = null;

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2600);
  }

  /** Clipboard API needs a secure context; falls back to a hidden textarea. */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy-failed'));
    });
  }

  function initCopyButtons() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest ? event.target.closest('[data-copy]') : null;
      if (!trigger) return;
      event.preventDefault();
      var value = trigger.getAttribute('data-copy');
      var message = trigger.getAttribute('data-copy-message') || ('Copied "' + value + '"');
      copyText(value).then(
        function () { showToast(message); },
        function () { showToast('Copy failed — the text is ' + value); }
      );
    });
  }

  /* ---------- 5. scroll reveal -------------------------------------------- */

  function initReveal() {
    var staggerParents = document.querySelectorAll('[data-reveal-stagger]');
    for (var p = 0; p < staggerParents.length; p++) {
      var kids = staggerParents[p].children;
      for (var k = 0; k < kids.length; k++) {
        kids[k].style.setProperty('--i', String(k));
      }
    }

    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('visible');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  /* ---------- boot -------------------------------------------------------- */

  function init() {
    markCurrentNavLink();
    initScrolledNav();
    initClocks();
    initCopyButtons();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Exposed for the clock page, which has its own toast triggers. */
  window.spananiSite = { showToast: showToast, copyText: copyText };
})();
