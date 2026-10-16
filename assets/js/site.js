(function () {
  'use strict';

  function normalizePath(path) {
    if (!path) return '/';
    var p = path.replace(/index\.html$/, '');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  function markCurrentNavLink() {
    var here = normalizePath(window.location.pathname);
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      var current = normalizePath(links[i].getAttribute('href') || '') === here;
      links[i].classList.toggle('is-current', current);
      if (current) links[i].setAttribute('aria-current', 'page');
      else links[i].removeAttribute('aria-current');
    }
  }

  function initClocks() {
    var els = document.querySelectorAll('[data-berlin-clock]');
    if (!els.length) return;
    var fmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    function tick() {
      var t = fmt.format(new Date());
      for (var i = 0; i < els.length; i++) els[i].textContent = t;
    }
    tick();
    setInterval(tick, 1000);
  }

  var toastTimer = null;
  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
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
      if (ok) resolve(); else reject(new Error('copy-failed'));
    });
  }

  function markCopied(el) {
    if (el.tagName !== 'BUTTON' || el.classList.contains('is-copied')) return;
    var label = el.textContent;
    el.classList.add('is-copied');
    el.textContent = 'Copied';
    setTimeout(function () {
      el.classList.remove('is-copied');
      el.textContent = label;
    }, 1800);
  }

  function selectFallback(trigger, value) {
    var scope = trigger.closest('.actions, .handle, .handle-line, .reach-row, .service') || document;
    var target = scope.querySelector('[data-copy-target]');
    if (target && window.getSelection) {
      var range = document.createRange();
      range.selectNodeContents(target);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      showToast('Couldn’t copy automatically. ' + value + ' is selected, copy it from there.');
    } else {
      showToast('Couldn’t copy automatically. The text is: ' + value);
    }
  }

  function initCopyButtons() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest ? event.target.closest('[data-copy]') : null;
      if (!trigger) return;
      event.preventDefault();
      var value = trigger.getAttribute('data-copy');
      var message = trigger.getAttribute('data-copy-message') || ('Copied ' + value);
      copyText(value).then(
        function () { showToast(message); markCopied(trigger); },
        function () { selectFallback(trigger, value); }
      );
    });
  }

  function initCommandPicker() {
    var root = document.querySelector('[data-cmd]');
    if (!root) return;
    var input = root.querySelector('.cmd-input');
    var items = Array.prototype.slice.call(root.querySelectorAll('.cmd-item'));
    var empty = root.querySelector('.cmd-empty');
    var hint = root.querySelector('[data-touch-hint]');
    if (hint && window.matchMedia('(pointer: coarse)').matches) hint.textContent = hint.getAttribute('data-touch-hint');

    function visible() {
      return items.filter(function (a) { return !a.parentElement.hidden; });
    }

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase().replace(/^\//, '');
      items.forEach(function (a) {
        a.parentElement.hidden = q !== '' && a.textContent.toLowerCase().indexOf(q) === -1;
      });
      if (empty) empty.hidden = visible().length > 0;
    });

    input.addEventListener('keydown', function (e) {
      var v = visible();
      if (e.key === 'ArrowDown' && v.length) { e.preventDefault(); v[0].focus(); }
      if (e.key === 'Enter' && v.length) { e.preventDefault(); window.location.href = v[0].href; }
    });

    root.addEventListener('keydown', function (e) {
      var v = visible();
      var i = v.indexOf(document.activeElement);
      if (i === -1) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); (v[i + 1] || v[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (i === 0) input.focus(); else v[i - 1].focus(); }
      if (e.key === 'Escape') { e.preventDefault(); input.focus(); }
    });
  }

  function init() {
    markCurrentNavLink();
    initClocks();
    initCopyButtons();
    initCommandPicker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.spananiSite = { showToast: showToast, copyText: copyText };
})();
