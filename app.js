/* app.js — Zenar Family Heritage Website */

(function() {
  'use strict';

  // ===== THEME TOGGLE =====
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let theme = root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.setAttribute('data-theme', theme);
  updateToggleIcon();

  if (toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      updateToggleIcon();
    });
  }

  function updateToggleIcon() {
    if (!toggle) return;
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ===== TAB NAVIGATION =====
  // Use event delegation on the tab container for reliable mobile taps
  var tabContainer = document.querySelector('.tab-nav');

  function switchTab(tabId) {
    // Deactivate all tabs and panels
    var btns = document.querySelectorAll('.tab-btn');
    var panels = document.querySelectorAll('.tab-panel');

    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.remove('active');
      btns[i].setAttribute('aria-selected', 'false');
    }
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.remove('active');
      panels[j].style.animation = 'none';
    }

    var activeBtn = document.querySelector('[data-tab="' + tabId + '"]');
    var activePanel = document.getElementById(tabId);

    if (activeBtn && activePanel) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
      activePanel.classList.add('active');
      // Re-trigger fade animation
      void activePanel.offsetWidth;
      activePanel.style.animation = '';

      // Initialize Space Invaders when arcade tab is activated
      if (tabId === 'arcade' && window.initSpaceInvaders && !window._gameInitialized) {
        window._gameInitialized = true;
        window.initSpaceInvaders();
      }

      // Scroll page to top
      window.scrollTo(0, 0);

      // Scroll the active tab button into view within the tab bar
      try {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch(e) {
        // Fallback for older browsers
        activeBtn.scrollIntoView(false);
      }
    }
  }

  if (tabContainer) {
    // Single delegated listener — works for both click and touch
    tabContainer.addEventListener('click', function(e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      e.preventDefault();
      var tabId = btn.getAttribute('data-tab');
      if (tabId) {
        switchTab(tabId);
      }
    });
  }

  // ===== HEADER SCROLL EFFECT =====
  var header = document.querySelector('.site-header');

  function onScroll() {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hash-based navigation
  function handleHash() {
    var hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
      switchTab(hash);
    } else {
      switchTab('home');
    }
  }

  window.addEventListener('hashchange', handleHash);
  handleHash();

})();
