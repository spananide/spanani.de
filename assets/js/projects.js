(function () {
  'use strict';

  var container = document.querySelector('[data-projects]');
  if (!container) return;

  var filtersContainer = document.querySelector('.filters');
  var filterButtons = document.querySelectorAll('.filter');
  var statusEl = document.querySelector('[data-filter-status]');
  var tiles = container.querySelectorAll('.tile');

  var isDe = (document.documentElement.lang || '').indexOf('de') === 0;

  function hasCategory(tile, cat) {
    if (cat === 'all') return true;
    var catsAttr = tile.getAttribute('data-cats') || '';
    var cats = catsAttr.split(/\s+/);
    for (var i = 0; i < cats.length; i++) {
      if (cats[i] === cat) return true;
    }
    return false;
  }

  // Count tiles per category and populate each .filter-count
  for (var f = 0; f < filterButtons.length; f++) {
    var btn = filterButtons[f];
    var cat = btn.getAttribute('data-filter');
    var countSpan = btn.querySelector('.filter-count');
    if (countSpan) {
      var count = 0;
      if (cat === 'all') {
        count = tiles.length;
      } else {
        for (var t = 0; t < tiles.length; t++) {
          if (hasCategory(tiles[t], cat)) {
            count++;
          }
        }
      }
      countSpan.textContent = String(count);
    }
  }

  function applyFilter(cat, updateHash) {
    var validCat = false;
    for (var i = 0; i < filterButtons.length; i++) {
      if (filterButtons[i].getAttribute('data-filter') === cat) {
        validCat = true;
        break;
      }
    }
    if (!validCat) cat = 'all';

    // Update aria-pressed on buttons
    for (var j = 0; j < filterButtons.length; j++) {
      var b = filterButtons[j];
      var isCurrent = b.getAttribute('data-filter') === cat;
      b.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
    }

    // Filter tiles and update stagger --i
    var visibleCount = 0;
    for (var k = 0; k < tiles.length; k++) {
      var tile = tiles[k];
      var matches = hasCategory(tile, cat);
      if (matches) {
        tile.removeAttribute('hidden');
        tile.style.setProperty('--i', String(visibleCount));
        tile.style.animation = 'none';
        void tile.offsetHeight;
        tile.style.animation = '';
        visibleCount++;
      } else {
        tile.setAttribute('hidden', '');
      }
    }

    // Update status element
    if (statusEl) {
      if (isDe) {
        statusEl.textContent = visibleCount + ' Projekte angezeigt';
      } else {
        statusEl.textContent = 'Showing ' + visibleCount + ' projects';
      }
    }

    // Update URL hash
    if (updateHash && window.history && window.history.replaceState) {
      var newUrl = window.location.pathname + window.location.search + (cat === 'all' ? '' : '#' + cat);
      window.history.replaceState(null, '', newUrl);
    }
  }

  // Click handler on filter buttons
  if (filtersContainer) {
    filtersContainer.addEventListener('click', function (e) {
      var target = e.target;
      while (target && target !== filtersContainer && !target.classList.contains('filter')) {
        target = target.parentNode;
      }
      if (target && target.classList && target.classList.contains('filter')) {
        var cat = target.getAttribute('data-filter');
        if (cat) {
          applyFilter(cat, true);
        }
      }
    });
  }

  // On load: read location.hash and apply
  var initialHash = (window.location.hash || '').replace(/^#/, '');
  var matchedInitial = false;
  if (initialHash) {
    for (var m = 0; m < filterButtons.length; m++) {
      if (filterButtons[m].getAttribute('data-filter') === initialHash) {
        matchedInitial = true;
        break;
      }
    }
  }

  if (matchedInitial) {
    applyFilter(initialHash, false);
  } else {
    applyFilter('all', false);
  }
})();
