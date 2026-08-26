/**
 * Mulat Media — Draggable Stats Widget
 * Powered by Abacus API (abacus.jasoncameron.dev)
 * 
 * Features:
 * - Live site visits counter (does NOT increment on refresh / same session)
 * - Live like counter (limited strictly to 1 like per user via localStorage)
 * - Dedicated drag handle & non-conflicting touch/mouse dragging
 * - Smooth boundary clamping & cross-page position persistence
 * - Accessible with keyboard support and theme compatibility (light/dark)
 */

(function () {
  'use strict';

  var NAMESPACE = 'mulat-media';
  var API_BASE = 'https://abacus.jasoncameron.dev';
  var STORAGE_LIKED = 'mulat_media_has_liked';
  var STORAGE_POS = 'mulat_stats_widget_pos_v2';
  var STORAGE_VISITS_CACHE = 'mulat_cached_visits';
  var STORAGE_LIKES_CACHE = 'mulat_cached_likes';
  var SESSION_VISITED = 'mulat_session_visited';

  function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString();
  }

  function parseCount(data) {
    if (!data) return null;
    if (typeof data.value === 'number') return data.value;
    if (typeof data.count === 'number') return data.count;
    if (data.value && !isNaN(Number(data.value))) return Number(data.value);
    return null;
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 5000;
    if (window.AbortController) {
      var controller = new AbortController();
      var id = setTimeout(function () { controller.abort(); }, timeoutMs);
      var opts = Object.assign({}, options || {}, { signal: controller.signal });
      return fetch(url, opts).finally(function () { clearTimeout(id); });
    }
    return fetch(url, options);
  }

  function initStatsWidget() {
    if (document.getElementById('mulatStatsWidget')) return;

    // Create widget markup
    var widget = document.createElement('aside');
    widget.id = 'mulatStatsWidget';
    widget.className = 'mulat-stats-widget';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'Site statistics and feedback');

    widget.innerHTML = [
      '<div class="stats-drag-handle" id="statsDragHandle" title="Drag to reposition" aria-label="Drag widget handle">',
      '  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">',
      '    <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>',
      '    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>',
      '    <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>',
      '  </svg>',
      '</div>',
      '<div class="stats-pill-content">',
      '  <div class="stats-stat stats-visits" title="Total site visits">',
      '    <svg class="stats-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>',
      '      <circle cx="12" cy="12" r="3"></circle>',
      '    </svg>',
      '    <span class="stats-num" id="statsVisitsCount">0</span>',
      '    <span class="stats-tag">visits</span>',
      '  </div>',
      '  <div class="stats-sep" aria-hidden="true"></div>',
      '  <button type="button" id="statsLikeBtn" class="stats-stat stats-like-btn" aria-label="Like Mulat Media" aria-pressed="false" title="Click to like (1 like per reader)">',
      '    <svg class="stats-icon heart-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
      '    </svg>',
      '    <span class="stats-num" id="statsLikesCount">0</span>',
      '    <span class="stats-tag">likes</span>',
      '  </button>',
      '</div>',
      '<div class="stats-toast" id="statsToast" role="status" aria-live="polite"></div>'
    ].join('');

    document.body.appendChild(widget);

    var visitsEl = document.getElementById('statsVisitsCount');
    var likesEl = document.getElementById('statsLikesCount');
    var likeBtn = document.getElementById('statsLikeBtn');
    var toastEl = document.getElementById('statsToast');

    // 1. Restore Cached Values Immediately (Prevents layout shift/delay)
    var cachedVisits = null;
    var cachedLikes = null;
    try {
      cachedVisits = localStorage.getItem(STORAGE_VISITS_CACHE);
      cachedLikes = localStorage.getItem(STORAGE_LIKES_CACHE);
    } catch (e) {}

    if (cachedVisits !== null) visitsEl.textContent = formatNumber(parseInt(cachedVisits, 10));
    if (cachedLikes !== null) likesEl.textContent = formatNumber(parseInt(cachedLikes, 10));

    // Check if user already liked
    var hasLiked = false;
    try {
      hasLiked = localStorage.getItem(STORAGE_LIKED) === 'true';
    } catch (e) {}

    if (hasLiked) {
      likeBtn.classList.add('is-liked');
      likeBtn.setAttribute('aria-pressed', 'true');
      likeBtn.setAttribute('title', "You've liked Mulat Media! (1 like per reader)");
    }

    // 2. Fetch and Sync API Data
    // A) Record Page Visit (Guard with sessionStorage to PREVENT duplicate count on refresh)
    var isSessionVisited = false;
    try {
      isSessionVisited = sessionStorage.getItem(SESSION_VISITED) === 'true';
    } catch (e) {}

    if (isSessionVisited) {
      // Refresh or intra-session navigation: Fetch current count WITHOUT incrementing
      fetchWithTimeout(API_BASE + '/get/' + NAMESPACE + '/visits')
        .then(function (res) {
          if (!res.ok) {
            // If key doesn't exist yet, initialize with hit
            return fetchWithTimeout(API_BASE + '/hit/' + NAMESPACE + '/visits').then(function (r) { return r.json(); });
          }
          return res.json();
        })
        .then(function (data) {
          var val = parseCount(data);
          if (val !== null) {
            visitsEl.textContent = formatNumber(val);
            try { localStorage.setItem(STORAGE_VISITS_CACHE, String(val)); } catch (e) {}
          }
        })
        .catch(function () {
          if (cachedVisits !== null) visitsEl.textContent = formatNumber(parseInt(cachedVisits, 10));
        });
    } else {
      // First visit in this browser session: Increment counter via /hit
      try { sessionStorage.setItem(SESSION_VISITED, 'true'); } catch (e) {}
      fetchWithTimeout(API_BASE + '/hit/' + NAMESPACE + '/visits')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var val = parseCount(data);
          if (val !== null) {
            visitsEl.textContent = formatNumber(val);
            try { localStorage.setItem(STORAGE_VISITS_CACHE, String(val)); } catch (e) {}
          }
        })
        .catch(function () {
          if (cachedVisits !== null) visitsEl.textContent = formatNumber(parseInt(cachedVisits, 10));
        });
    }

    // B) Fetch Current Like Count (Get Endpoint with fallback)
    fetchWithTimeout(API_BASE + '/get/' + NAMESPACE + '/likes')
      .then(function (res) {
        if (!res.ok) {
          // Counter might not be initialized yet
          return { value: 0 };
        }
        return res.json();
      })
      .then(function (data) {
        var val = parseCount(data);
        if (val !== null) {
          likesEl.textContent = formatNumber(val);
          try { localStorage.setItem(STORAGE_LIKES_CACHE, String(val)); } catch (e) {}
        }
      })
      .catch(function () {
        if (cachedLikes !== null) likesEl.textContent = formatNumber(parseInt(cachedLikes, 10));
      });

    // 3. Toast Helper with Smart Screen-Edge Alignment
    var toastTimeout = null;
    function adjustToastPosition() {
      if (!toastEl || !widget) return;
      toastEl.classList.remove('toast-left', 'toast-right', 'toast-bottom');

      var widgetRect = widget.getBoundingClientRect();
      var margin = 12;

      // If widget is close to top of viewport, show toast below
      if (widgetRect.top < 50) {
        toastEl.classList.add('toast-bottom');
      }

      // Check left/right screen boundaries
      var widgetCenter = widgetRect.left + widgetRect.width / 2;
      var toastWidth = toastEl.offsetWidth || 175;
      var halfToast = toastWidth / 2;

      if (widgetCenter - halfToast < margin) {
        toastEl.classList.add('toast-left');
      } else if (widgetCenter + halfToast > window.innerWidth - margin) {
        toastEl.classList.add('toast-right');
      }
    }

    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      adjustToastPosition();
      toastEl.classList.add('toast-show');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(function () {
        toastEl.classList.remove('toast-show');
      }, 2500);
    }

    // 4. Like Button Click Handler (Strict 1 Like Limit)
    function handleLikeClick(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      var alreadyLiked = false;
      try {
        alreadyLiked = localStorage.getItem(STORAGE_LIKED) === 'true';
      } catch (err) {}

      if (alreadyLiked) {
        likeBtn.classList.remove('shake-anim');
        // Force reflow for re-triggering animation
        void likeBtn.offsetWidth;
        likeBtn.classList.add('shake-anim');
        showToast("You've already liked Mulat Media ❤️");
        return;
      }

      // First time liking!
      try {
        localStorage.setItem(STORAGE_LIKED, 'true');
      } catch (err) {}

      likeBtn.classList.add('is-liked', 'pop-anim');
      likeBtn.setAttribute('aria-pressed', 'true');
      likeBtn.setAttribute('title', "You've liked Mulat Media! (1 like per reader)");

      // Optimistically update count
      var currentCount = parseInt(likesEl.textContent.replace(/,/g, ''), 10);
      if (isNaN(currentCount)) currentCount = 0;
      var newCount = currentCount + 1;
      likesEl.textContent = formatNumber(newCount);
      try { localStorage.setItem(STORAGE_LIKES_CACHE, String(newCount)); } catch (err) {}

      // Create floating heart effect
      createHeartBurst(likeBtn);
      showToast('Thank you for your support! ❤️');

      // Sync with Abacus Hit API
      fetchWithTimeout(API_BASE + '/hit/' + NAMESPACE + '/likes')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var val = parseCount(data);
          if (val !== null) {
            likesEl.textContent = formatNumber(val);
            try { localStorage.setItem(STORAGE_LIKES_CACHE, String(val)); } catch (e) {}
          }
        })
        .catch(function (err) {
          console.warn('Abacus like sync fallback to local count:', err);
        });
    }

    likeBtn.addEventListener('click', handleLikeClick);

    function createHeartBurst(btn) {
      var rect = btn.getBoundingClientRect();
      for (var i = 0; i < 6; i++) {
        var heart = document.createElement('span');
        heart.className = 'floating-heart';
        heart.textContent = '❤️';
        var offsetX = (Math.random() - 0.5) * 24;
        var offsetY = (Math.random() - 0.5) * 16;
        heart.style.left = (rect.left + rect.width / 2 + offsetX) + 'px';
        heart.style.top = (rect.top + offsetY) + 'px';
        heart.style.setProperty('--dx', ((Math.random() - 0.5) * 60) + 'px');
        heart.style.setProperty('--dy', (-40 - Math.random() * 40) + 'px');
        document.body.appendChild(heart);
        (function (h) {
          setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 900);
        })(heart);
      }
    }

    // 5. Position & Dragging Logic
    setupDragging(widget, likeBtn);
  }

  function setupDragging(widget, likeBtn) {
    var isPointerDown = false;
    var startPointerX = 0;
    var startPointerY = 0;
    var startWidgetX = 0;
    var startWidgetY = 0;
    var hasMoved = false;
    var moveThreshold = 5; // px to distinguish click vs drag

    // Position clamping within viewport
    function clampPosition(left, top) {
      var margin = 12;
      var w = widget.offsetWidth || 220;
      var h = widget.offsetHeight || 44;
      var maxLeft = Math.max(margin, window.innerWidth - w - margin);
      var maxTop = Math.max(margin, window.innerHeight - h - margin);

      return {
        left: Math.min(Math.max(margin, left), maxLeft),
        top: Math.min(Math.max(margin, top), maxTop)
      };
    }

    function setWidgetPosition(left, top, save) {
      var clamped = clampPosition(left, top);
      widget.style.left = clamped.left + 'px';
      widget.style.top = clamped.top + 'px';
      widget.style.bottom = 'auto';
      widget.style.right = 'auto';

      if (save) {
        try {
          localStorage.setItem(STORAGE_POS, JSON.stringify({
            xRatio: clamped.left / Math.max(1, window.innerWidth),
            yRatio: clamped.top / Math.max(1, window.innerHeight),
            left: clamped.left,
            top: clamped.top
          }));
        } catch (e) {}
      }
    }

    // Restore saved position
    function restorePosition() {
      var saved = null;
      try {
        var raw = localStorage.getItem(STORAGE_POS);
        if (raw) saved = JSON.parse(raw);
      } catch (e) {}

      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
        var targetLeft = saved.xRatio ? saved.xRatio * window.innerWidth : saved.left;
        var targetTop = saved.yRatio ? saved.yRatio * window.innerHeight : saved.top;
        setWidgetPosition(targetLeft, targetTop, false);
      } else {
        // Default position: Bottom-left with safe margins
        var margin = 24;
        var defaultTop = window.innerHeight - 70 - margin;
        var defaultLeft = margin;
        setWidgetPosition(defaultLeft, defaultTop, false);
      }
    }

    requestAnimationFrame(function () {
      restorePosition();
    });

    window.addEventListener('resize', function () {
      var currentLeft = widget.offsetLeft;
      var currentTop = widget.offsetTop;
      setWidgetPosition(currentLeft, currentTop, false);
    });

    // Pointer Events for Cross-Device Dragging
    widget.addEventListener('pointerdown', function (e) {
      // Do NOT start dragging if pointer is on the Like button
      if (e.target.closest('#statsLikeBtn') || e.target.closest('.stats-like-btn')) {
        return;
      }

      // Only allow primary mouse button
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      isPointerDown = true;
      hasMoved = false;
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      startWidgetX = widget.offsetLeft;
      startWidgetY = widget.offsetTop;

      if (widget.setPointerCapture) {
        try { widget.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    widget.addEventListener('pointermove', function (e) {
      if (!isPointerDown) return;

      var deltaX = e.clientX - startPointerX;
      var deltaY = e.clientY - startPointerY;
      var distance = Math.hypot(deltaX, deltaY);

      if (!hasMoved && distance > moveThreshold) {
        hasMoved = true;
        widget.classList.add('is-dragging');
      }

      if (hasMoved) {
        var newLeft = startWidgetX + deltaX;
        var newTop = startWidgetY + deltaY;
        setWidgetPosition(newLeft, newTop, false);
      }
    });

    function endDrag(e) {
      if (!isPointerDown) return;
      isPointerDown = false;

      if (hasMoved) {
        widget.classList.remove('is-dragging');
        setWidgetPosition(widget.offsetLeft, widget.offsetTop, true);
      }

      if (widget.releasePointerCapture && e && e.pointerId) {
        try { widget.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }

    widget.addEventListener('pointerup', endDrag);
    widget.addEventListener('pointercancel', endDrag);
  }

  // Auto-init on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatsWidget);
  } else {
    initStatsWidget();
  }
})();
