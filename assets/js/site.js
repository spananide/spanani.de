(function () {
  'use strict';

  var DE = (document.documentElement.lang || '').indexOf('de') === 0;
  var T = DE ? {
    copied: 'Kopiert',
    copyFailSelected: 'Automatisches Kopieren ging nicht. {v} ist markiert, kopier es von dort.',
    copyFailText: 'Automatisches Kopieren ging nicht. Der Text lautet: {v}',
    briefCopied: 'Nachricht kopiert. Füg sie in Discord ein.',
    status: { online: 'Gerade online auf Discord', idle: 'Abwesend auf Discord', dnd: 'Bitte nicht stören auf Discord', offline: 'Offline auf Discord' }
  } : {
    copied: 'Copied',
    copyFailSelected: 'Couldn’t copy automatically. {v} is selected, copy it from there.',
    copyFailText: 'Couldn’t copy automatically. The text is: {v}',
    briefCopied: 'Message copied. Paste it into Discord.',
    status: { online: 'Online on Discord', idle: 'Away on Discord', dnd: 'Do not disturb on Discord', offline: 'Offline on Discord' }
  };
  var DISCORD_ID = '723110232263491635';

  var ITEMS = [
    // Pages
    { k: 'page', en: 'Home', de: 'Start', go: DE ? '/de/' : '/' },
    { k: 'page', en: 'Projects', de: 'Projekte', go: DE ? '/de/projekte/' : '/projects/' },
    { k: 'page', en: 'Build for you', de: 'Leistungen', go: DE ? '/de/leistungen/' : '/services/' },
    { k: 'page', en: 'Tools', de: 'Tools', go: '/tools/' },
    { k: 'page', en: 'Contact', de: 'Kontakt', go: DE ? '/de/kontakt/' : '/contact/' },
    { k: 'page', en: 'Changelog', de: 'Changelog', go: '/changelog/' },
    { k: 'page', en: 'Impressum', de: 'Impressum', go: '/impressum/' },
    { k: 'page', en: 'Privacy policy', de: 'Datenschutz', go: '/datenschutz/' },

    // Tools
    { k: 'tool', en: 'Discord embed builder', de: 'Discord-Embed-Builder', go: '/tools/discord-embed/' },
    { k: 'tool', en: 'Discord permissions calculator', de: 'Discord-Rechterechner', go: '/tools/discord-permissions/' },
    { k: 'tool', en: 'Discord timestamp generator', de: 'Discord-Zeitstempel', go: '/tools/discord-timestamp/' },
    { k: 'tool', en: 'Minecraft MOTD creator', de: 'Minecraft-MOTD-Generator', go: '/tools/minecraft-motd/' },

    // Projects
    { k: 'project', en: 'Atomic Precision Clock', de: 'Atomic Precision Clock', go: '/clock/' },
    { k: 'project', en: 'Tagesspiele (daily games)', de: 'Tagesspiele', go: 'https://geo.spanani.de/', hint: 'daily games' },
    { k: 'project', en: 'Server map', de: 'Server-Karte', go: 'https://server.spanani.de/' },
    { k: 'project', en: 'Flags', de: 'Flaggen', go: '/flags/' },
    { k: 'project', en: 'Pausenklau', de: 'Pausenklau', go: '/pausenklau/' },
    { k: 'project', en: 'Rust Empire', de: 'Rust Empire', go: '/rust/' },
    { k: 'project', en: 'Tennis', de: 'Tennis', go: '/tennis/' },
    { k: 'project', en: 'FMHY for iOS', de: 'FMHY for iOS', go: 'https://github.com/spananide/fmhy-ios' },

    // Actions
    { k: 'action', en: 'Copy Discord handle', de: 'Discord-Namen kopieren', act: 'copy-handle', hint: 'spanani' },
    { k: 'action', en: 'Open Discord profile', de: 'Discord-Profil öffnen', go: 'https://discord.com/users/723110232263491635', act: 'discord' },
    { k: 'action', en: 'Join the Discord server', de: 'Discord-Server beitreten', go: 'https://discord.gg/NfVExtZZJs', act: 'join' },
    { k: 'action', en: 'Email me', de: 'E-Mail schreiben', go: 'mailto:webmaster@spanani.de?subject=Project%20enquiry', act: 'mail' },
    { k: 'action', en: DE ? 'Switch to English' : 'Switch to Deutsch', de: DE ? 'Zu Englisch wechseln' : 'Zu Deutsch wechseln', act: 'lang', hint: 'language sprache english deutsch' }
  ];

  var KIND_LABELS = DE ? {
    page: 'Seite',
    tool: 'Tool',
    project: 'Projekt',
    action: 'Aktion'
  } : {
    page: 'Page',
    tool: 'Tool',
    project: 'Project',
    action: 'Action'
  };

  var GROUP_TITLES = DE ? {
    page: 'Seiten',
    tool: 'Tools',
    project: 'Projekte',
    action: 'Aktionen'
  } : {
    page: 'Pages',
    tool: 'Tools',
    project: 'Projects',
    action: 'Actions'
  };

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
    el.textContent = T.copied;
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
      showToast(T.copyFailSelected.replace('{v}', value));
    } else {
      showToast(T.copyFailText.replace('{v}', value));
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

  // Live Discord presence via Lanyard. Stays hidden until the account is monitored
  // (join discord.gg/lanyard) or if the request fails for any reason.
  function initDiscordStatus() {
    var els = document.querySelectorAll('[data-discord-status]');
    if (!els.length || !window.fetch) return;
    fetch('https://api.lanyard.rest/v1/users/' + DISCORD_ID)
      .then(function (r) { return r.json(); })
      .then(function (json) {
        var status = json && json.success && json.data && json.data.discord_status;
        if (!T.status[status]) return;
        for (var i = 0; i < els.length; i++) {
          var dot = els[i].querySelector('.dot-live');
          dot.classList.toggle('pending', status === 'idle' || status === 'offline');
          dot.classList.toggle('warn', status === 'dnd');
          els[i].querySelector('[data-discord-status-text]').textContent = T.status[status];
          els[i].hidden = false;
        }
      })
      .catch(function () {});
  }

  // Contact page: turns a few answers into a first message the visitor sends themselves.
  function initBrief() {
    var form = document.querySelector('[data-brief]');
    if (!form) return;
    var out = document.querySelector('[data-brief-out]');
    var mail = document.querySelector('[data-brief-mail]');
    var discord = document.querySelector('[data-brief-discord]');

    function compose() {
      var lines = [form.getAttribute('data-greeting'), ''];
      var subject = form.getAttribute('data-subject');
      for (var i = 0; i < form.elements.length; i++) {
        var el = form.elements[i];
        var prefix = el.getAttribute('data-line');
        if (!prefix || (el.type === 'radio' && !el.checked)) continue;
        var value = el.type === 'radio' ? el.getAttribute('data-label') : el.value.trim();
        if (el.type === 'radio') subject += ': ' + el.getAttribute('data-subject');
        if (value) lines.push(prefix + value);
      }
      lines.push('', form.getAttribute('data-signoff'));
      var text = lines.join('\n');
      out.textContent = text;
      mail.href = 'mailto:webmaster@spanani.de?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
      return text;
    }

    form.addEventListener('input', compose);
    form.addEventListener('change', compose);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    // The link opens Discord natively; copying runs in the same click so no popup blocker gets involved.
    discord.addEventListener('click', function () {
      var text = compose();
      copyText(text).then(
        function () { showToast(T.briefCopied); },
        function () { showToast(T.copyFailText.replace('{v}', text)); }
      );
    });
    compose();
  }

  function isCurrentPage(item) {
    if (!item.go) return false;
    var here = normalizePath(window.location.pathname);
    var target = normalizePath(item.go);
    return here === target;
  }

  function switchLanguage() {
    var here = normalizePath(window.location.pathname);
    var map = {
      '/': '/de/',
      '/de': '/',
      '/projects': '/de/projekte/',
      '/de/projekte': '/projects/',
      '/services': '/de/leistungen/',
      '/de/leistungen': '/services/',
      '/contact': '/de/kontakt/',
      '/de/kontakt': '/contact/'
    };
    var target = map[here];
    if (!target) target = DE ? '/' : '/de/';
    window.location.href = target;
  }

  var paletteEl = null;
  var inputEl = null;
  var listEl = null;
  var lastFocusedEl = null;
  var filteredItems = [];
  var selectedIndex = -1;

  function getMatches(query) {
    var available = ITEMS.filter(function (it) {
      return !isCurrentPage(it);
    });
    var q = (query || '').trim().toLowerCase();
    if (!q) {
      var groups = [];
      var order = ['page', 'tool', 'project', 'action'];
      for (var i = 0; i < order.length; i++) {
        var kind = order[i];
        var list = available.filter(function (it) { return it.k === kind; });
        if (list.length) {
          groups.push({ kind: kind, title: GROUP_TITLES[kind], items: list });
        }
      }
      return { isGrouped: true, groups: groups };
    }

    var words = q.split(/\s+/).filter(Boolean);
    var matches = available.filter(function (it) {
      var label = (DE ? it.de : it.en) || '';
      var kindLabel = KIND_LABELS[it.k] || '';
      var text = (label + ' ' + (it.hint || '') + ' ' + kindLabel).toLowerCase();
      for (var w = 0; w < words.length; w++) {
        if (text.indexOf(words[w]) === -1) return false;
      }
      return true;
    });

    matches.sort(function (a, b) {
      var aLabel = ((DE ? a.de : a.en) || '').toLowerCase();
      var bLabel = ((DE ? b.de : b.en) || '').toLowerCase();
      var aStarts = aLabel.indexOf(q) === 0 ? 0 : 1;
      var bStarts = bLabel.indexOf(q) === 0 ? 0 : 1;
      return aStarts - bStarts;
    });

    return { isGrouped: false, items: matches.slice(0, 12) };
  }

  function appendItem(item) {
    var idx = filteredItems.length;
    filteredItems.push(item);

    var el = document.createElement('div');
    el.className = 'palette-item';
    el.id = 'palette-opt-' + idx;
    el.setAttribute('role', 'option');
    el.setAttribute('data-idx', idx);

    var label = (DE ? item.de : item.en) || '';
    var kindLabel = KIND_LABELS[item.k] || '';

    var labelSpan = document.createElement('span');
    labelSpan.className = 'palette-label';
    labelSpan.textContent = label;

    var kindSpan = document.createElement('span');
    kindSpan.className = 'palette-kind';
    kindSpan.textContent = kindLabel;

    el.appendChild(labelSpan);
    el.appendChild(kindSpan);
    listEl.appendChild(el);
  }

  function updateSelection() {
    var options = listEl.querySelectorAll('.palette-item');
    for (var i = 0; i < options.length; i++) {
      var isSel = (i === selectedIndex);
      options[i].setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel) {
        inputEl.setAttribute('aria-activedescendant', options[i].id);
        options[i].scrollIntoView({ block: 'nearest' });
      }
    }
    if (selectedIndex === -1 || options.length === 0) {
      inputEl.removeAttribute('aria-activedescendant');
    }
  }

  function renderResults(result) {
    listEl.innerHTML = '';
    filteredItems = [];

    if (result.isGrouped) {
      for (var g = 0; g < result.groups.length; g++) {
        var grp = result.groups[g];
        var grpHeading = document.createElement('div');
        grpHeading.className = 'palette-group';
        grpHeading.textContent = grp.title;
        listEl.appendChild(grpHeading);

        for (var i = 0; i < grp.items.length; i++) {
          appendItem(grp.items[i]);
        }
      }
    } else {
      if (result.items.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'palette-empty';
        empty.textContent = DE ? 'Nichts gefunden.' : 'Nothing found.';
        listEl.appendChild(empty);
      } else {
        for (var j = 0; j < result.items.length; j++) {
          appendItem(result.items[j]);
        }
      }
    }

    selectedIndex = filteredItems.length > 0 ? 0 : -1;
    updateSelection();
  }

  function runItem(item) {
    closePalette();
    if (item.act === 'copy-handle') {
      copyText('spanani').then(
        function () {
          showToast(DE ? 'Kopiert: „spanani“. Füg mich auf Discord hinzu.' : 'Copied "spanani". Add me on Discord.');
        },
        function () {
          showToast(T.copyFailText.replace('{v}', 'spanani'));
        }
      );
      return;
    }
    if (item.act === 'lang') {
      switchLanguage();
      return;
    }
    var url = item.go;
    if (!url) return;
    if (url.indexOf('http') === 0) {
      window.open(url, '_blank', 'noopener');
    } else if (url.indexOf('mailto:') === 0) {
      window.location.href = url;
    } else {
      window.location.href = url;
    }
  }

  function ensurePaletteDOM() {
    if (paletteEl) return;
    paletteEl = document.createElement('div');
    paletteEl.className = 'palette';
    paletteEl.hidden = true;
    paletteEl.setAttribute('role', 'dialog');
    paletteEl.setAttribute('aria-modal', 'true');
    paletteEl.setAttribute('aria-label', DE ? 'Suche' : 'Search');

    var card = document.createElement('div');
    card.className = 'palette-card';

    var field = document.createElement('div');
    field.className = 'palette-field';

    inputEl = document.createElement('input');
    inputEl.className = 'palette-input';
    inputEl.type = 'search';
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    inputEl.setAttribute('role', 'combobox');
    inputEl.setAttribute('aria-expanded', 'true');
    inputEl.setAttribute('aria-controls', 'palette-list');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('placeholder', DE ? 'Suchen oder springen zu…' : 'Search or jump to…');

    field.appendChild(inputEl);

    listEl = document.createElement('div');
    listEl.className = 'palette-list';
    listEl.id = 'palette-list';
    listEl.setAttribute('role', 'listbox');

    var hint = document.createElement('div');
    hint.className = 'palette-hint';
    hint.innerHTML =
      '<span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> ' + (DE ? 'navigieren' : 'navigate') + '</span> ' +
      '<span><kbd class="kbd">Enter</kbd> ' + (DE ? 'öffnen' : 'open') + '</span> ' +
      '<span><kbd class="kbd">Esc</kbd> ' + (DE ? 'schließen' : 'close') + '</span>';

    card.appendChild(field);
    card.appendChild(listEl);
    card.appendChild(hint);
    paletteEl.appendChild(card);

    document.body.appendChild(paletteEl);

    inputEl.addEventListener('input', function () {
      renderResults(getMatches(inputEl.value));
    });

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        inputEl.focus();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex = (selectedIndex + 1) % filteredItems.length;
          updateSelection();
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
          updateSelection();
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems.length > 0 && selectedIndex >= 0 && filteredItems[selectedIndex]) {
          runItem(filteredItems[selectedIndex]);
        }
        return;
      }
    });

    listEl.addEventListener('mousemove', function (e) {
      var itemEl = e.target.closest ? e.target.closest('.palette-item') : null;
      if (!itemEl) return;
      var idx = parseInt(itemEl.getAttribute('data-idx'), 10);
      if (!isNaN(idx) && idx !== selectedIndex) {
        selectedIndex = idx;
        updateSelection();
      }
    });

    listEl.addEventListener('click', function (e) {
      var itemEl = e.target.closest ? e.target.closest('.palette-item') : null;
      if (!itemEl) return;
      var idx = parseInt(itemEl.getAttribute('data-idx'), 10);
      if (!isNaN(idx) && filteredItems[idx]) {
        runItem(filteredItems[idx]);
      }
    });

    paletteEl.addEventListener('click', function (e) {
      if (e.target === paletteEl) {
        closePalette();
      }
    });
  }

  function openPalette() {
    ensurePaletteDOM();
    lastFocusedEl = document.activeElement;
    inputEl.value = '';
    renderResults(getMatches(''));
    paletteEl.hidden = false;
    inputEl.focus();
  }

  function closePalette() {
    if (!paletteEl || paletteEl.hidden) return;
    paletteEl.hidden = true;
    if (lastFocusedEl && lastFocusedEl.focus) {
      try { lastFocusedEl.focus(); } catch (e) {}
    }
  }

  function injectNavSearch() {
    if (document.querySelector('.nav-search')) return;
    var container = document.querySelector('.nav-links') || document.querySelector('.nav-inner');
    if (!container) return;
    var isMac = /Mac/.test(navigator.platform || '');
    var kbdText = isMac ? '⌘ K' : 'Ctrl K';
    var label = DE ? 'Suche' : 'Search';
    var btn = document.createElement('button');
    btn.className = 'nav-search';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-label', label + ' (' + kbdText + ')');
    btn.innerHTML = '<span class="nav-search-label">' + label + '</span> <kbd class="kbd">' + kbdText + '</kbd>';
    container.appendChild(btn);
  }

  function initPaletteShortcuts() {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (paletteEl && !paletteEl.hidden) closePalette();
        else openPalette();
        return;
      }
      if (e.key === '/' && (!paletteEl || paletteEl.hidden)) {
        var active = document.activeElement;
        var tag = (active && active.tagName) || '';
        var isEditable = active && (active.isContentEditable || active.getAttribute('contenteditable') === 'true');
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !isEditable) {
          e.preventDefault();
          openPalette();
        }
      }
    });

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('.nav-search, .hero-search, [data-palette-open]') : null;
      if (trigger) {
        e.preventDefault();
        openPalette();
      }
    });
  }

  function init() {
    markCurrentNavLink();
    initClocks();
    initCopyButtons();
    initDiscordStatus();
    initBrief();
    injectNavSearch();
    initPaletteShortcuts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.spananiSite = { showToast: showToast, copyText: copyText };
})();
