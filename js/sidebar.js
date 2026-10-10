/* ── Enterprise Sidebar Controller ── */
(function() {
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const collapseIcon = document.getElementById('collapse-icon');
  const hamburger = document.getElementById('hamburger-btn');
  const closeMobile = document.getElementById('sidebar-close-mobile');
  const menuSearch = document.getElementById('menu-search');
  const COLLAPSE_KEY = 'rbe_sidebar_collapsed';

  function isDesktop() { return window.innerWidth > 1024; }

  function applyCollapsed(collapsed) {
    if (!sidebar) return;
    if (collapsed) {
      sidebar.classList.add('collapsed');
      if (collapseIcon) collapseIcon.className = 'fas fa-angles-right';
      if (collapseBtn) collapseBtn.title = 'Expand menu';
    } else {
      sidebar.classList.remove('collapsed');
      if (collapseIcon) collapseIcon.className = 'fas fa-angles-left';
      if (collapseBtn) collapseBtn.title = 'Collapse menu';
    }
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch (e) {}
  }

  if (isDesktop()) {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') applyCollapsed(true);
    } catch (e) {}
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!isDesktop()) return;
      applyCollapsed(!sidebar.classList.contains('collapsed'));
    });
  }

  if (hamburger) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      sidebar.classList.add('open');
      if (closeMobile) closeMobile.style.display = 'flex';
    });
  }

  if (closeMobile) {
    closeMobile.addEventListener('click', function(e) {
      e.stopPropagation();
      sidebar.classList.remove('open');
      closeMobile.style.display = 'none';
    });
  }

  document.addEventListener('click', function(e) {
    if (!isDesktop() && sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && e.target !== hamburger && !(hamburger && hamburger.contains(e.target))) {
        sidebar.classList.remove('open');
        if (closeMobile) closeMobile.style.display = 'none';
      }
    }
  });

  if (menuSearch) {
    menuSearch.addEventListener('input', function() {
      const q = menuSearch.value.trim().toLowerCase();
      const items = sidebar.querySelectorAll('#sidebar-menu li[data-section], #sidebar-menu li#logout-btn');
      const groups = sidebar.querySelectorAll('.menu-group-label');
      items.forEach(function(li) {
        const keywords = (li.getAttribute('data-keywords') || '') + ' ' + (li.getAttribute('data-tooltip') || '') + ' ' + (li.textContent || '');
        li.style.display = (!q || keywords.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
      });
      groups.forEach(function(g) {
        let next = g.nextElementSibling;
        let anyVisible = false;
        while (next && !next.classList.contains('menu-group-label') && next.id !== 'logout-btn') {
          if (next.style.display !== 'none' && next.getAttribute('data-section')) anyVisible = true;
          next = next.nextElementSibling;
        }
        g.style.display = (anyVisible || !q) ? '' : 'none';
      });
    });
  }

  window.addEventListener('resize', function() {
    if (!isDesktop()) {
      sidebar.classList.remove('collapsed');
      if (collapseIcon) collapseIcon.className = 'fas fa-angles-left';
    } else {
      try {
        if (localStorage.getItem(COLLAPSE_KEY) === '1') applyCollapsed(true);
      } catch (e) {}
      sidebar.classList.remove('open');
    }
  });

  // Keep avatar initials in sync when email is set (hook after auth)
  const emailEl = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (emailEl && avatarEl) {
    const obs = new MutationObserver(function() {
      const email = (emailEl.textContent || '').trim();
      if (email && email !== '—') {
        const parts = email.split('@')[0].split(/[._-]/);
        const initials = parts.slice(0, 2).map(function(p) { return (p[0] || '').toUpperCase(); }).join('') || 'OP';
        avatarEl.textContent = initials.slice(0, 2);
      }
    });
    obs.observe(emailEl, { childList: true, characterData: true, subtree: true });
  }
})();
