  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
  import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
  import { getFirestore, collection, doc, setDoc, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, updateDoc, where, getDocs, getDoc, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";


  /* ═══════════════════════════════════════════════════════════
     Modal stack manager – open/close in sequence + body scroll lock
     - openModal(id) pushes onto stack
     - closeModal(id?) closes top (or specific) and restores previous
     - Escape / backdrop click closes top only
     - Background (body + .main) never scrolls while any modal is open
     ═══════════════════════════════════════════════════════════ */
  const ModalStack = {
    stack: [],
    _scrollY: 0,
    _locked: false,

    _lockBody() {
      if (this._locked) return;
      this._scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.classList.add('modal-open');
      document.body.style.top = `-${this._scrollY}px`;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.left = '0';
      document.body.style.right = '0';
      this._locked = true;
    },

    _unlockBody() {
      if (!this._locked) return;
      document.body.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';
      window.scrollTo(0, this._scrollY);
      this._locked = false;
    },

    _refreshStackUI() {
      // Only top modal is interactive; others are dimmed behind
      this.stack.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('active');
        if (idx < this.stack.length - 1) el.classList.add('stacked-behind');
        else el.classList.remove('stacked-behind');
        // z-index by depth
        el.style.zIndex = String(2000 + idx);
      });
    },

    open(id) {
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) {
        console.warn('Modal not found:', id);
        return;
      }
      // If already on top, noop
      if (this.stack.length && this.stack[this.stack.length - 1] === id) {
        this._refreshStackUI();
        return;
      }
      // If already in stack lower down, bring to top
      const existing = this.stack.indexOf(id);
      if (existing !== -1) this.stack.splice(existing, 1);
      this.stack.push(id);
      this._lockBody();
      this._refreshStackUI();
      // Focus first focusable inside for a11y
      try {
        const focusable = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
      } catch (e) {}
    },

    close(id) {
      if (!this.stack.length) return;
      // Close specific or top
      let target = id;
      if (!target) target = this.stack[this.stack.length - 1];
      const idx = this.stack.lastIndexOf(target);
      if (idx === -1) {
        // Not in stack – still force-hide element if present
        const el = document.getElementById(target);
        if (el) {
          el.classList.remove('active', 'stacked-behind');
          el.style.zIndex = '';
        }
        return;
      }
      // Pop everything from idx to top (closes target and any that were opened on top of it)
      const removed = this.stack.splice(idx);
      removed.forEach(mid => {
        const el = document.getElementById(mid);
        if (el) {
          el.classList.remove('active', 'stacked-behind');
          el.style.zIndex = '';
        }
      });
      if (this.stack.length) {
        this._refreshStackUI();
      } else {
        this._unlockBody();
      }
    },

    closeTop() {
      if (!this.stack.length) return;
      this.close(this.stack[this.stack.length - 1]);
    },

    closeAll() {
      while (this.stack.length) this.closeTop();
    },

    isOpen(id) {
      return this.stack.includes(id);
    },

    top() {
      return this.stack.length ? this.stack[this.stack.length - 1] : null;
    }
  };

  window.openModal = (id) => ModalStack.open(id);
  window.closeModal = (id) => ModalStack.close(id);
  window.closeTopModal = () => ModalStack.closeTop();
  window.closeAllModals = () => ModalStack.closeAll();

  // Escape closes top modal only (sequence-aware)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ModalStack.stack.length) {
      e.preventDefault();
      ModalStack.closeTop();
    }
  });

  // Backdrop click (direct on .modal, not content) closes top
  document.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    if (!modal || !modal.classList.contains('active')) return;
    // only if the click landed on the backdrop itself
    if (e.target === modal && ModalStack.top() === modal.id) {
      ModalStack.closeTop();
    }
  }, true);

  // Prevent wheel/touch from scrolling body when over a modal backdrop
  document.addEventListener('wheel', (e) => {
    if (!ModalStack.stack.length) return;
    const content = e.target.closest('.modal-content');
    if (!content) {
      // scrolling on backdrop – block
      e.preventDefault();
      return;
    }
    // at edges of scrollable content, prevent chaining
    const { scrollTop, scrollHeight, clientHeight } = content;
    const delta = e.deltaY;
    const atTop = scrollTop <= 0 && delta < 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && delta > 0;
    if (atTop || atBottom) e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!ModalStack.stack.length) return;
    const content = e.target.closest('.modal-content');
    if (!content) {
      e.preventDefault();
    }
  }, { passive: false });


  const firebaseConfig = {
    apiKey: "AIzaSyCnDsQVhQxk9Q7axCPcMSpHDcqOonBbNMc",
    authDomain: "rbe-equipment.firebaseapp.com",
    projectId: "rbe-equipment",
    storageBucket: "rbe-equipment.firebasestorage.app",
    messagingSenderId: "481759813476",
    appId: "1:481759813476:web:ef176ffa73fb65e01ca471",
    measurementId: "G-15E0HZJ2X6"
  };


  /*
   * Example firestore.rules (deploy via Firebase CLI) — production-grade shaft-scoped RBAC
   *
   * rules_version = '2';
   * service cloud.firestore {
   *   match /databases/{database}/documents {
   *     function isSignedIn() { return request.auth != null; }
   *     function userDoc() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
   *     function isAdmin() { return isSignedIn() && userDoc().role == 'admin'; }
   *     function isActive() { return isSignedIn() && userDoc().status != 'disabled'; }
   *     function shaftAllowed(shaft) {
   *       return isAdmin()
   *         || (shaft == null || shaft == '')
   *         || (userDoc().allowedShafts is list && shaft in userDoc().allowedShafts);
   *     }
   *
   *     match /users/{uid} {
   *       allow read: if isSignedIn() && (request.auth.uid == uid || isAdmin());
   *       allow create, update: if isAdmin();
   *       allow delete: if false;
   *     }
   *     match /user_invites/{id} {
   *       allow read, write: if isAdmin();
   *     }
   *     match /equipment/{id} {
   *       allow read: if isActive() && shaftAllowed(resource.data.shaft);
   *       allow create, update: if isActive() && shaftAllowed(request.resource.data.shaft);
   *       allow delete: if isAdmin();
   *     }
   *     match /status_updates/{id} {
   *       allow read: if isActive();
   *       allow create: if isActive() && shaftAllowed(request.resource.data.shaft);
   *       allow update, delete: if isAdmin();
   *     }
   *     match /maintenance/{id} {
   *       allow read: if isActive();
   *       allow write: if isActive();
   *     }
   *     match /audit_log/{id} {
   *       allow read: if isActive() && (isAdmin() || userDoc().role in ['executive','reliability']);
   *       allow create: if isSignedIn();
   *       allow update, delete: if false;
   *     }
   *     match /{document=**} {
   *       allow read, write: if false;
   *     }
   *   }
   * }
   *
   * Technical users: mint short-lived custom tokens via Cloud Functions / service accounts.
   * Never store end-user passwords for integrations. Set custom claims role + allowedShafts when possible.
   */

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let equipment = [], updates = [], maintenance = [], delaysData = [];
  let currentShaftFilter = '', currentTypeFilter = '';
  const EQUIPMENT_TYPES = ['Loco','Winder','Winch','Compressor','Loader','Substation','Ventilation Fan','Pump','Conveyor','Drill','Transformer','Other'];
  let unsubscribeFunctions = [], charts = {}, calendar = null;
  let excelData = [], selectedMapping = {}, availableColumns = [];
  let dismissedAlerts = new Set(JSON.parse(localStorage.getItem('rbe_dismissed') || '[]'));
  const TABLE_PAGE_SIZE = 10;
  window._tableExpandState = {}; window._tableFullRows = {};

  // Roles: admin (full) | operations (no delete) | viewer (no import / delete / text-mining / add equipment)
  let currentUser = null;
  let currentUserRole = 'operations';
  // Enterprise RBAC: admin (full) | reliability (analytics + ops write) | operations | executive (view + audit) | viewer
  const VALID_ROLES = ['admin', 'reliability', 'operations', 'executive', 'viewer'];
  // Production feature flags (set true for production hardening)
  const DISABLE_PUBLIC_SIGNUP = true;   // hide self-registration; invite-only
  const ENFORCE_SHAFT_SCOPE = true;     // deny actions outside allowedShafts (admins exempt)
  let currentAllowedShafts = [];        // empty = no operational access when ENFORCE_SHAFT_SCOPE
  let currentUserStatus = 'active';     // active | disabled | pending
  let auditEvents = []; // in-memory + persisted critical actions for Audit Trail view
  try { auditEvents = JSON.parse(localStorage.getItem('rbe_audit_events') || '[]'); } catch (e) { auditEvents = []; }

  function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }
  window.showToast = showToast;

  function getActor() {
    const u = auth.currentUser;
    if (!u) return { uid: '', email: 'unknown', name: 'Unknown', companyNumber: '' };
    const profileCn = (currentUser && (currentUser.companyNumber || currentUser.companyNo || currentUser.employeeNumber)) || '';
    return {
      uid: u.uid || '',
      email: u.email || 'unknown',
      name: (u.displayName || u.email || 'Unknown').split('@')[0],
      companyNumber: profileCn || ''
    };
  }

  function can(action, context) {
    const r = currentUserRole || 'viewer';
    context = context || {};
    // Disabled accounts cannot act
    if (currentUserStatus === 'disabled') return false;
    // Role matrix
    let roleOk = false;
    if (r === 'admin') roleOk = true;
    else if (action === 'delete_equipment' || action === 'audit_admin' || action === 'manage_users') roleOk = false;
    else if (action === 'import' || action === 'text_mining' || action === 'add_equipment') {
      roleOk = (r === 'operations' || r === 'reliability');
    } else if (action === 'edit_equipment' || action === 'add_status' || action === 'mark_fixed' || action === 'maint') {
      roleOk = (r === 'operations' || r === 'reliability');
    } else if (action === 'reliability_center' || action === 'view_audit') {
      roleOk = (r === 'reliability' || r === 'executive' || r === 'operations');
    } else {
      roleOk = true; // view
    }
    if (!roleOk) return false;
    // Shaft scope (admins exempt)
    if (ENFORCE_SHAFT_SCOPE && r !== 'admin') {
      const shaft = context.shaft != null ? String(context.shaft).trim() : '';
      if (shaft) {
        if (!currentAllowedShafts || !currentAllowedShafts.length) return false;
        if (!currentAllowedShafts.includes(shaft)) return false;
      }
      // If equipmentId provided without shaft, resolve from equipment cache
      if (!shaft && context.equipmentId) {
        const eq = (equipment || []).find(e => String(e.id) === String(context.equipmentId));
        const eqShaft = eq ? String(eq.shaft || '').trim() : '';
        if (eqShaft) {
          if (!currentAllowedShafts || !currentAllowedShafts.length) return false;
          if (!currentAllowedShafts.includes(eqShaft)) return false;
        }
      }
    }
    return true;
  }
  window.can = can;

  function assertCan(action, context, friendly) {
    if (can(action, context)) return true;
    const msg = friendly || (ENFORCE_SHAFT_SCOPE && context && context.shaft
      ? ('Not authorized for this shaft (' + context.shaft + ')')
      : 'Not authorized for this action');
    showToast(msg, 'error');
    try { logAudit('authz_denied', action + ': ' + msg, (context && context.equipmentId) || ''); } catch (e) {}
    return false;
  }
  window.assertCan = assertCan;

  function userCanAccessShaft(shaft) {
    if (!ENFORCE_SHAFT_SCOPE) return true;
    if ((currentUserRole || '') === 'admin') return true;
    const s = String(shaft || '').trim();
    // Empty/unassigned shaft is not accessible to scoped users (prevents data leak across shafts)
    if (!s) return false;
    return Array.isArray(currentAllowedShafts) && currentAllowedShafts.includes(s);
  }
  window.userCanAccessShaft = userCanAccessShaft;

  function filterByAllowedShafts(list, shaftKey) {
    if (!ENFORCE_SHAFT_SCOPE || (currentUserRole || '') === 'admin') return list || [];
    const key = shaftKey || 'shaft';
    const allowed = currentAllowedShafts || [];
    if (!allowed.length) return []; // no operational access
    return (list || []).filter(item => {
      const s = String(item[key] || item.shaft || '').trim();
      // Require a shaft and membership in allowedShafts (no empty-shaft leak)
      return !!s && allowed.includes(s);
    });
  }
  window.filterByAllowedShafts = filterByAllowedShafts;

  function logAudit(action, detail, equipmentId, extra) {
    const actor = getActor();
    extra = extra || {};
    let shaft = extra.shaft || '';
    if (!shaft && equipmentId) {
      const eq = (equipment || []).find(e => String(e.id) === String(equipmentId));
      if (eq) shaft = eq.shaft || '';
    }
    const entry = {
      ts: new Date().toISOString(),
      action: String(action || 'event'),
      detail: String(detail || ''),
      equipmentId: equipmentId || '',
      shaft: shaft || '',
      by: actor.email || actor.name || 'unknown',
      email: actor.email || '',
      role: currentUserRole || 'unknown',
      uid: actor.uid || '',
      companyNumber: actor.companyNumber || '',
      actorType: extra.actorType || 'user',
      source: extra.source || 'ui'
    };
    auditEvents.unshift(entry);
    if (auditEvents.length > 500) auditEvents = auditEvents.slice(0, 500);
    try { localStorage.setItem('rbe_audit_events', JSON.stringify(auditEvents)); } catch (e) {}
    // Always attempt Firestore audit_log for privileged / change actions (rules enforce immutability)
    try {
      if (auth.currentUser) {
        addDoc(collection(db, 'audit_log'), { ...entry, createdAt: serverTimestamp() }).catch(() => {});
      }
    } catch (e) {}
  }
  window.logAudit = logAudit;

  function applyRoleUI() {
    const role = currentUserRole || 'viewer';
    const emailEl = document.getElementById('sidebar-user-email');
    const badge = document.getElementById('sidebar-role-badge');
    if (emailEl) emailEl.textContent = currentUser?.email || '—';
    if (badge) {
      badge.textContent = role;
      badge.className = 'role-badge ' + role;
    }
    const shaftsHint = document.getElementById('sidebar-shafts-hint');
    if (shaftsHint) {
      if (role === 'admin') {
        shaftsHint.textContent = 'Shafts: ALL (admin)';
        shaftsHint.title = 'Administrator — all shafts';
      } else if (!currentAllowedShafts || !currentAllowedShafts.length) {
        shaftsHint.textContent = ENFORCE_SHAFT_SCOPE ? 'Shafts: none assigned' : 'Shafts: all (scope off)';
        shaftsHint.title = 'No allowedShafts on profile';
      } else {
        const label = currentAllowedShafts.length <= 3
          ? currentAllowedShafts.join(', ')
          : (currentAllowedShafts.slice(0, 2).join(', ') + ' +' + (currentAllowedShafts.length - 2) + ' more');
        shaftsHint.textContent = 'Shafts: ' + label;
        shaftsHint.title = currentAllowedShafts.join(', ');
      }
    }
    document.querySelectorAll('#sidebar-menu li[data-roles]').forEach(li => {
      const allowed = (li.dataset.roles || '').split(',').map(s => s.trim());
      li.style.display = allowed.includes(role) ? '' : 'none';
    });
    document.querySelectorAll('[data-roles]:not(#sidebar-menu li)').forEach(el => {
      const allowed = (el.dataset.roles || '').split(',').map(s => s.trim());
      el.style.display = allowed.includes(role) ? '' : 'none';
    });
    const active = document.querySelector('#sidebar-menu li.active');
    if (active && active.style.display === 'none') show('dashboard');
  }
  window.applyRoleUI = applyRoleUI;

  async function ensureUserProfile(user) {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    try {
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        // Invite-only: do not auto-create privileged profiles when public signup is disabled.
        // Migration safety: still create a minimal pending profile so the app does not crash;
        // admins must assign role + allowedShafts.
        const payload = {
          email: user.email || '',
          role: 'viewer',
          displayName: (user.email || '').split('@')[0],
          allowedShafts: [],
          status: DISABLE_PUBLIC_SIGNUP ? 'pending' : 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(ref, payload);
        currentUserRole = payload.role;
        currentAllowedShafts = [];
        currentUserStatus = payload.status;
      } else {
        const data = existing.data() || {};
        let role = String(data.role || 'operations').toLowerCase();
        if (!VALID_ROLES.includes(role)) role = 'operations';
        currentUserRole = role;
        currentUserStatus = String(data.status || 'active').toLowerCase();
        // Migration: if allowedShafts missing, default to all known shafts once (do not lock out existing users)
        if (!Array.isArray(data.allowedShafts)) {
          const allShafts = (typeof RBE_SHAFTS !== 'undefined' ? RBE_SHAFTS.slice() : []);
          currentAllowedShafts = allShafts;
          try {
            await setDoc(ref, {
              allowedShafts: allShafts,
              status: data.status || 'active',
              email: data.email || user.email || '',
              updatedAt: new Date().toISOString(),
              migratedShaftScope: true
            }, { merge: true });
          } catch (e) {}
        } else {
          currentAllowedShafts = data.allowedShafts.map(s => String(s).trim()).filter(Boolean);
        }
        if (currentUserStatus === 'disabled') {
          showToast('Account disabled. Contact administrator.', 'error');
          try { await signOut(auth); } catch (e) {}
          return;
        }
        if (currentUserStatus === 'pending') {
          // Activate on first successful login
          try {
            await setDoc(ref, { status: 'active', updatedAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() }, { merge: true });
            currentUserStatus = 'active';
          } catch (e) {}
        } else {
          try {
            await setDoc(ref, { lastLoginAt: new Date().toISOString(), email: data.email || user.email || '' }, { merge: true });
          } catch (e) {}
        }
        if (!data.email && user.email) {
          await setDoc(ref, { email: user.email, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    } catch (err) {
      console.warn('User profile load failed, defaulting to operations', err);
      currentUserRole = 'operations';
      currentAllowedShafts = (typeof RBE_SHAFTS !== 'undefined' ? RBE_SHAFTS.slice() : []);
      currentUserStatus = 'active';
    }
    currentUser = {
      uid: user.uid,
      email: user.email,
      role: currentUserRole,
      allowedShafts: currentAllowedShafts.slice(),
      status: currentUserStatus,
      companyNumber: ''
    };
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data() || {};
        currentUser.companyNumber = d.companyNumber || d.companyNo || d.employeeNumber || '';
      }
    } catch (e) {}
    applyRoleUI();
    try { logAudit('login', 'User signed in', '', { source: 'ui', actorType: 'user' }); } catch (e) {}
  }

  // ── Auth ─────────────────────────────────────────────────────
  const authSection = document.getElementById('auth-section');
  const appDiv = document.getElementById('app');
  let isLoginMode = true;

  // Apply invite-only UX
  (function applySignupPolicy() {
    const wrap = document.getElementById('public-signup-wrap');
    const hint = document.getElementById('invite-only-hint');
    if (DISABLE_PUBLIC_SIGNUP) {
      if (wrap) wrap.classList.add('hidden');
      if (hint) hint.classList.remove('hidden');
      isLoginMode = true;
    } else {
      if (wrap) wrap.classList.remove('hidden');
      if (hint) hint.classList.add('hidden');
    }
  })();

  document.getElementById('toggle-auth').onclick = e => {
    e.preventDefault();
    if (DISABLE_PUBLIC_SIGNUP) {
      showToast('Public registration is disabled. Contact an administrator for an invite.', 'error');
      return;
    }
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').textContent = isLoginMode ? "Sign In" : "Create Account";
    document.getElementById('auth-submit').textContent = isLoginMode ? "Sign In" : "Register";
    document.getElementById('toggle-auth').textContent = isLoginMode ? "Create an account" : "Already have an account? Sign in";
  };
  document.getElementById('auth-form').onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    document.getElementById('auth-error').textContent = "";
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (DISABLE_PUBLIC_SIGNUP) {
          document.getElementById('auth-error').textContent = 'Public registration is disabled. Use an administrator invite.';
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          email,
          role: 'operations',
          displayName: email.split('@')[0],
          allowedShafts: (typeof RBE_SHAFTS !== 'undefined' ? RBE_SHAFTS.slice() : []),
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showToast('Account created — role: operations', 'success');
        try { logAudit('user_self_register', 'Self-registered account', '', { source: 'ui' }); } catch (e) {}
      }
    } catch (err) {
      let msg = err.message;
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) msg = 'Wrong email or password';
      else if (msg.includes('user-not-found')) msg = 'Account not found';
      else if (msg.includes('email-already-in-use')) msg = 'Email already in use';
      document.getElementById('auth-error').textContent = msg;
      try { logAudit('login_failed', msg + ' for ' + email, '', { source: 'ui' }); } catch (e) {}
    }
  };
  document.getElementById('logout-btn').onclick = () => {
    try { logAudit('logout', 'User signed out', '', { source: 'ui' }); } catch (e) {}
    currentUser = null;
    currentUserRole = 'operations';
    currentAllowedShafts = [];
    currentUserStatus = 'active';
    signOut(auth);
  };
  onAuthStateChanged(auth, async user => {
    if (user) {
      authSection.classList.add('hidden');
      appDiv.classList.remove('hidden');
      await ensureUserProfile(user);
      if (auth.currentUser) {
        startRealtimeListeners();
        startSearchHistoryListener();
        try { populateShaftFilter(); } catch (e) {}
      }
    } else {
      authSection.classList.remove('hidden');
      appDiv.classList.add('hidden');
      currentUser = null;
      currentUserRole = 'operations';
      currentAllowedShafts = [];
      currentUserStatus = 'active';
    }
  });

  // ── Real-time ────────────────────────────────────────────────
  function startRealtimeListeners() {
    if (unsubscribeFunctions) unsubscribeFunctions.forEach(u => u());
    unsubscribeFunctions = [];
    unsubscribeFunctions.push(onSnapshot(collection(db, "equipment"), snap => {
      equipment = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fillDatalist(); populateShaftFilter(); refreshCurrentView(); updatePredictiveNotifications();
    }));
    const applyUpdates = snap => {
      const mapped = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      mapped.sort((a, b) => `${b.date||''} ${b.time||''}`.localeCompare(`${a.date||''} ${a.time||''}`));
      // Keep only unique status events (same equip/date/time/status/reason) so UI never shows repeats
      const seen = new Set();
      updates = [];
      for (const u of mapped) {
        const key = (typeof statusUpdateFingerprint === 'function') ? statusUpdateFingerprint(u) : `${u.equipmentId}|${u.date}|${u.time}|${u.status}|${u.reason}`;
        if (seen.has(key)) continue;
        seen.add(key);
        updates.push(u);
      }
      refreshCurrentView(); updatePredictiveNotifications();
      if (typeof refreshTextMiningInsights === 'function') refreshTextMiningInsights();
    };
    try {
      unsubscribeFunctions.push(onSnapshot(query(collection(db, "status_updates"), orderBy("date", "desc")), applyUpdates, () => {
        unsubscribeFunctions.push(onSnapshot(collection(db, "status_updates"), applyUpdates));
      }));
    } catch (e) {
      unsubscribeFunctions.push(onSnapshot(collection(db, "status_updates"), applyUpdates));
    }
    unsubscribeFunctions.push(onSnapshot(collection(db, "maintenance"), snap => {
      maintenance = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      refreshCurrentView(); updatePredictiveNotifications();
    }));
  }

  // ── Core helpers ─────────────────────────────────────────────
  function inferEquipmentType(eqOrId, sizeHint) {
    if (eqOrId && typeof eqOrId === 'object') {
      const explicit = String(eqOrId.equipmentType || eqOrId.type || '').trim();
      if (explicit) return EQUIPMENT_TYPES.find(t => t.toLowerCase() === explicit.toLowerCase()) || explicit;
      sizeHint = eqOrId.locoSize || eqOrId.size || sizeHint;
      eqOrId = eqOrId.id || '';
    }
    const s = String(eqOrId || '').toLowerCase() + ' ' + String(sizeHint || '').toLowerCase();
    if (/winder/.test(s)) return 'Winder';
    if (/winch/.test(s)) return 'Winch';
    if (/compress/.test(s)) return 'Compressor';
    if (/loader|lhd|scoop/.test(s)) return 'Loader';
    if (/substation|sub-station/.test(s)) return 'Substation';
    if (/vent|fan\b/.test(s)) return 'Ventilation Fan';
    if (/pump/.test(s)) return 'Pump';
    if (/conveyor|belt/.test(s)) return 'Conveyor';
    if (/drill|jumbo/.test(s)) return 'Drill';
    if (/transform/.test(s)) return 'Transformer';
    if (/loco|locomotive|\blh\b/.test(s) || /^\d{3,5}$/.test(String(eqOrId||'').trim())) return 'Loco';
    return 'Other';
  }
  function isUnknownEquipmentId(id) {
    const s = String(id || '').trim();
    return !s || /^(unknown|n\/?a|none|null|undefined|-|—)$/i.test(s);
  }
  function sanitizeEquipmentId(raw) {
    let id = String(raw || '').trim();
    if (!id || isUnknownEquipmentId(id)) return null;
    id = id.replace(/[\/\\#?[\]]+/g, '-').replace(/\s+/g, ' ').trim();
    id = id.replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (id === '.' || id === '..' || !id) return null;
    if (id.length > 200) id = id.slice(0, 200);
    return id;
  }

  /** Stable fingerprint for a status update — used to skip re-imports and de-dupe audit trail */
  function statusUpdateFingerprint(u) {
    const equip = String(u.equipmentId || u.locoNumber || '').trim().toLowerCase();
    const date = String(u.date || '').trim().slice(0, 10);
    const time = String(u.time || '').trim().slice(0, 5);
    const status = String(u.status || '').trim().toLowerCase();
    const reason = String(u.reason || u.fault || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const down = String(u.downtimeHours ?? u.downtime ?? '').trim();
    return [equip, date, time, status, reason, down].join('|');
  }

  /** Soft key without time (import reports sometimes omit exact minutes) */
  function statusUpdateSoftKey(u) {
    const equip = String(u.equipmentId || u.locoNumber || '').trim().toLowerCase();
    const date = String(u.date || '').trim().slice(0, 10);
    const status = String(u.status || '').trim().toLowerCase();
    const reason = String(u.reason || u.fault || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return [equip, date, status, reason].join('|');
  }

  function looksLikeCompanyNumber(val) {
    const s = String(val || '').trim();
    if (!s) return false;
    if (/^[A-Za-z]{0,3}[\s\-]?[0-9]{3,12}$/.test(s)) return true;
    if (/^[0-9]{3,12}$/.test(s)) return true;
    return false;
  }

  /** Prefer company number; only show a personal name when no company number is available. */
  function formatPersonDisplay(companyNo, nameOrFallback) {
    const cn = String(companyNo || '').trim();
    const nm = String(nameOrFallback || '').trim();
    if (cn && looksLikeCompanyNumber(cn)) return cn;
    if (nm && looksLikeCompanyNumber(nm)) return nm;
    if (cn && !nm) return cn;
    if (nm) return nm;
    if (cn) return cn;
    return '—';
  }

  function personFromUpdate(u, role) {
    if (!u) return '—';
    if (role === 'reported') {
      const cn = u.reportedByCompanyNumber || u.reportedByCompany || u.operatorCompanyNumber || u.companyNumber || '';
      const nm = u.reportedBy || u.operator || u.reportedByName || '';
      return formatPersonDisplay(cn, nm);
    }
    if (role === 'signed') {
      const cn = u.signedByCompanyNumber || u.signedByCompany || u.fixedByCompanyNumber || '';
      const nm = u.signedBy || u.fixedBy || u.signedByName || '';
      return formatPersonDisplay(cn, nm);
    }
    const cn = u.updatedByCompanyNumber || u.changedByCompanyNumber || u.companyNumber || '';
    const nm = u.updatedByEmail || u.updatedBy || u.changedBy || u.operator || '';
    return formatPersonDisplay(cn, nm);
  }

  function focusAlertTarget(kind, id) {
    const equipId = String(id || '').trim();
    if (!equipId) return;
    const details = document.getElementById('dash-alert-details');
    if (details && details.classList.contains('collapsed')) {
      details.classList.remove('collapsed');
      const btn = document.querySelector('#dashboard-alert-summary .btn-view-more');
      if (btn) btn.textContent = 'Hide details';
    }
    if (kind === 'maint') {
      show('maintenance-schedule');
      setTimeout(function() {
        const qf = document.getElementById('qf-maint');
        if (qf) { qf.value = equipId; quickFindInTable('maint-table', equipId); }
      }, 80);
      return;
    }
    if (typeof showEquipmentDetail === 'function') showEquipmentDetail(equipId);
    else {
      show('manage-equipment');
      setTimeout(function() {
        const qf = document.getElementById('qf-equipment');
        if (qf) { qf.value = equipId; quickFindInTable('equipment-table', equipId); }
      }, 80);
    }
  }
  window.focusAlertTarget = focusAlertTarget;

  function getFilteredEquipment() {
    let list = equipment || [];
    // Shaft-scoped RBAC: non-admins only see equipment whose shaft is in allowedShafts.
    // Unassigned (empty shaft) equipment is hidden from non-admins so it does not leak into every shaft view.
    if (ENFORCE_SHAFT_SCOPE && (currentUserRole || '') !== 'admin') {
      const allowed = currentAllowedShafts || [];
      if (!allowed.length) list = [];
      else list = list.filter(e => {
        const s = String(e.shaft || '').trim();
        return !!s && allowed.includes(s);
      });
    }
    // UI shaft filter — strict match (same as index S). Empty shaft never matches a selected shaft.
    if (currentShaftFilter) list = list.filter(e => String(e.shaft || '').trim() === currentShaftFilter);
    if (currentTypeFilter) list = list.filter(e => inferEquipmentType(e) === currentTypeFilter);
    return list;
  }
  function getFilteredUpdates() {
    let list = (updates || []).filter(u => !isUnknownEquipmentId(u.equipmentId || u.locoNumber));
    // Scope strictly to equipment the user can see after RBAC + UI filters (same as index S).
    // Do NOT bypass via update.shaft — that caused data to appear for shafts with no equipment.
    if (ENFORCE_SHAFT_SCOPE || currentShaftFilter || currentTypeFilter) {
      const allowed = new Set(getFilteredEquipment().map(e => String(e.id)));
      list = list.filter(u => allowed.has(String(u.equipmentId || u.locoNumber || '')));
    }
    return list;
  }
  function getFilteredMaintenance() {
    let list = (maintenance || []).slice();
    if (ENFORCE_SHAFT_SCOPE || currentShaftFilter || currentTypeFilter) {
      const allowed = new Set(getFilteredEquipment().map(e => String(e.id)));
      list = list.filter(m => allowed.has(String(m.equipment || '')));
    }
    return list;
  }
  function getActiveFilterLabel() {
    const p = [];
    if (currentShaftFilter) p.push(currentShaftFilter);
    if (currentTypeFilter) p.push(currentTypeFilter);
    return p.join(' · ') || '';
  }
  function applySystemFilters() {
    currentShaftFilter = document.getElementById('shaft-filter')?.value || '';
    currentTypeFilter = document.getElementById('type-filter')?.value || '';
    const chip = document.getElementById('filter-status-chip');
    if (chip) chip.textContent = (currentShaftFilter || 'All Shafts') + ' · ' + (currentTypeFilter || 'All Types');
    refreshCurrentView(); updatePredictiveNotifications();
    if (typeof refreshTextMiningInsights === 'function') refreshTextMiningInsights();
  }
  window.applySystemFilters = applySystemFilters;
  function clearSystemFilters() {
    const sf = document.getElementById('shaft-filter'); const tf = document.getElementById('type-filter');
    if (sf) sf.value = ''; if (tf) tf.value = '';
    applySystemFilters();
  }
  window.clearSystemFilters = clearSystemFilters;

  const RBE_SHAFTS = [
    '0 Shaft','1 Shaft','2 Shaft','3 Shaft','4 Shaft','5 Shaft','6 Shaft','7 Shaft','7A Shaft','8 Shaft','9 Shaft','10 Shaft','10D',
    '11 Shaft','11C Shaft','11D','12 Shaft','12 North Shaft','12S','14 Shaft','14D','16 Shaft','17 Shaft','20 Shaft',
    'TRANSPORT','CONCENTRATOR','SMELTER','CLAPHAM','DRIKOP','E&F Shaft','NORTH SHAFT','SOUTH SHAFT','STYLDRIFT','Winnaarshoek','Forest Hill',
    'Offset Underground','UG2 Main Decline','Merensky Main Decline','UG2 North Decline',
    '367-KT (Kalkfontein)','368-KT (Buffelshoek)','370-KT (Richmond)','372-KT (Dwarsrivier)',
    '373-KT (De Grooteboom)','374-KT (Tweefontein)','Leeuwkop Shaft','UTS'
  ];

  function populateShaftFilter() {
    let shafts = RBE_SHAFTS.slice();
    // Also include any shafts already present on equipment (future-proof)
    (equipment || []).forEach(e => {
      const s = String(e.shaft || '').trim();
      if (s && !shafts.includes(s)) shafts.push(s);
    });
    shafts.sort();
    // Restrict selectable shafts to user's allowedShafts (admins see all)
    if (ENFORCE_SHAFT_SCOPE && (currentUserRole || '') !== 'admin') {
      if (currentAllowedShafts && currentAllowedShafts.length) {
        shafts = shafts.filter(s => currentAllowedShafts.includes(s));
      } else {
        shafts = [];
      }
    }

    const sel = document.getElementById('shaft-filter');
    if (sel) {
      const current = sel.value;
      sel.innerHTML = '<option value="">All Shafts</option>' + shafts.map(s => `<option value="${s}">${s}</option>`).join('');
      if (current && shafts.includes(current)) sel.value = current;
      else if (current && !shafts.includes(current)) sel.value = '';
    }
    const tsel = document.getElementById('type-filter');
    if (tsel) {
      const curT = tsel.value;
      tsel.innerHTML = '<option value="">All Types</option>' + EQUIPMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
      if (curT) tsel.value = curT;
    }
    const addSel = document.getElementById('shaft');
    if (addSel) {
      const cur = addSel.value;
      addSel.innerHTML = '<option value="">Select Operation</option>' + shafts.map(s => `<option value="${s}">${s}</option>`).join('');
      if (cur) addSel.value = cur;
    }
    const editShaft = document.getElementById('edit-eq-shaft');
    if (editShaft) {
      const curE = editShaft.value;
      editShaft.innerHTML = '<option value="">— Unassigned —</option>' + shafts.map(s => `<option value="${s}">${s}</option>`).join('');
      if (curE) editShaft.value = curE;
    }
    const importShaft = document.getElementById('import-shaft');
    if (importShaft) {
      const curI = importShaft.value;
      importShaft.innerHTML = '<option value="">Auto-detect</option>' + shafts.map(s => `<option value="${s}">${s}</option>`).join('');
      if (curI) importShaft.value = curI;
    }
  }
  function fillDatalist() {
    const dl = document.getElementById('loco-list');
    if (!dl) return;
    const ids = [...new Set((equipment || []).map(e => e.id).concat((updates || []).map(u => u.equipmentId || u.locoNumber)).filter(Boolean))].sort();
    dl.innerHTML = ids.map(id => `<option value="${id}">`).join('');
  }

  /**
   * IMPROVED BUSINESS RULE (fixes the Problem Equipment table):
   * 1. Explicit status = "Fixed"  →  Up
   * 2. Latest reason/fault contains clear “fixed / adjusted / repaired / attended / completed”
   *    language  →  Up   (e.g. "FAILING BRAKES | ADJUSTED BRAKES", "FIXED LOOSE CONNECTION")
   * 3. Only genuine open Downs remain Down
   * 4. Predictive inspections never force a unit Down
   */
  function isAttendedOrFixed(reasonText, statusText) {
    const s = String(statusText || '').toLowerCase().trim();
    if (s === 'fixed' || s === 'up' || s === 'operational' || s === 'running') return true;

    const r = String(reasonText || '').toLowerCase();
    // Strong indicators that the breakdown was attended / completed
    const fixedPatterns = [
      /\badjusted\b/, /\bfixed\b/, /\brepaired\b/, /\battended\b/,
      /\bcompleted\b/, /\bresolved\b/, /\breplaced\b/, /\brestored\b/,/no faulty/,/short circuit/,/re railed/,
      /\bworking\b/, /\boperational\b/, /\bok\b/, /\bdone\b/,/\bprogrammed\b/,/\bcommissioned\b/,/\bre-reailed\b/,/\bback\b/,/\bon\b/,/\bbalanced\b/,/\bchanged\b/,/\bcharged\b/,/\bcharge\b/,/\bchange\b/,/\binstalled\b/,/\bjoined\b/,/\bwas\b/,/\btightened\b/,/\bdisconnected\b/,
      /fixed loose/, /adjusted brakes/, /brakes adjusted/,/false report/,/bshort circuit/,/filed cable/,/\breset\b/,/\bcallibrated\b/,/\bcable\b/,/\bno\b/,/\bNO\b/,/\bfaulty\b/,/\brecharged\b/,/\bfastened\b/,/\bconnected\b/,/\bfiled\b/,/\brailed\b/,/\bfalse\b/,/\bwellded\b/,
      /connection fixed/, /antenna fixed/, /repaired and/,/NO FAULT FOUND/,/short circuit/,/no fault/,/re railed/,/back on/,/filed cable/,/was loose/,/running now/,/cable fixed/,/no fault found/,/no problem found/
    ];
    return fixedPatterns.some(p => p.test(r));
  }

  function getEquipmentStatus(id) {
    const eu = getFilteredUpdates()
      .filter(u => String(u.equipmentId || u.locoNumber || '') === String(id))
      .sort((a, b) => String(b.date + ' ' + b.time).localeCompare(String(a.date + ' ' + a.time)));

    const last = eu[0];
    let currentlyDown = false;

    if (last) {
      const status = String(last.status || '').toLowerCase();
      const reason = last.reason || last.fault || last.description || '';

      // Rule 1 & 2: attended / fixed language overrides a "Down" label
      if (isAttendedOrFixed(reason, status)) {
        currentlyDown = false;
      } else if (status === 'down' || status === 'offline' || status === 'failed' || status === 'broken') {
        currentlyDown = true;
      } else {
        currentlyDown = false;
      }
    }

    const downtime = eu.reduce((s, u) => s + (Number(u.downtimeHours || u.downtime || 0) || 0), 0);
    const failures = eu.filter(u => {
      const s = String(u.status || '').toLowerCase();
      return u.isFailure === '1' || u.isFailure === 1 || String(u.isFailure || '').toLowerCase() === 'yes' ||
             s === 'down' || s === 'offline';
    }).length;

    const dates = eu.map(u => u.date).filter(Boolean).sort();
    let totalDays = 1;
    if (dates.length >= 2) {
      totalDays = Math.max(1, Math.ceil((new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000) + 1);
    }
    const downDays = downtime / 24;
    const avail = totalDays > 0 ? Math.max(0, Math.min(100, ((totalDays - downDays) / totalDays) * 100)) : 100;

    return {
      status: currentlyDown ? 'Down' : 'Up',
      downtime,
      failures,
      availability: avail.toFixed(1),
      lastUpdate: last ? (last.date + ' ' + (last.time || '')) : '-',
      lastReason: last ? (last.reason || last.fault || '') : '',
      color: currentlyDown || downtime > 168 ? 'RED' : (downtime > 24 || failures >= 2 ? 'ORANGE' : 'GREEN')
    };
  }
  window.getEquipmentStatus = getEquipmentStatus;

  /**
   * Enterprise reliability metrics per asset:
   * Health score (0-100), RUL days, anomaly score, MTBF, MTTR
   * Rule + statistical model — foundation for ML / digital-twin upgrade path
   */
  function getReliabilityMetrics(id) {
    const st = getEquipmentStatus(id);
    const eu = getFilteredUpdates().filter(u => String(u.equipmentId || u.locoNumber || '') === String(id))
      .sort((a, b) => String((a.date||'')+' '+(a.time||'')).localeCompare(String((b.date||'')+' '+(b.time||''))));
    const fails = Math.max(0, st.failures || 0);
    const downtime = st.downtime || 0;
    const avail = parseFloat(st.availability) || 100;

    // MTBF / MTTR
    let mtbf = 720; // default 30 days if no history
    let mttr = fails > 0 ? Math.max(0.5, downtime / fails) : 2;
    if (eu.length >= 2) {
      const dates = eu.map(u => u.date).filter(Boolean).sort();
      if (dates.length >= 2) {
        const hoursSpan = Math.max(24, (new Date(dates[dates.length - 1]) - new Date(dates[0])) / 3600000 + 24);
        mtbf = fails > 0 ? Math.max(8, (hoursSpan - downtime) / fails) : hoursSpan;
      }
    }

    // Anomaly score 0-100 (higher = more anomalous)
    let anomaly = 0;
    if (fails >= 4) anomaly += 35;
    else if (fails >= 2) anomaly += 20;
    else if (fails >= 1) anomaly += 8;
    if (avail < 70) anomaly += 30;
    else if (avail < 85) anomaly += 18;
    else if (avail < 95) anomaly += 8;
    if (downtime > 100) anomaly += 20;
    else if (downtime > 48) anomaly += 12;
    // Recurrence boost from text patterns
    const reasons = eu.map(u => String(u.reason || '').toLowerCase());
    const modeHits = {};
    reasons.forEach(r => {
      const m = tmClassifyReason(r).mode;
      modeHits[m] = (modeHits[m] || 0) + 1;
    });
    const maxMode = Math.max(0, ...Object.values(modeHits));
    if (maxMode >= 3) anomaly += 15;
    anomaly = Math.min(100, anomaly);

    // Health score inverse of risk
    let health = 100;
    health -= (100 - avail) * 0.45;
    health -= Math.min(35, fails * 6);
    health -= Math.min(20, downtime / 10);
    health -= anomaly * 0.15;
    health = Math.max(5, Math.min(100, Math.round(health)));

    // RUL estimate (days) — simple Weibull-like using MTBF and recent trend
    let rulDays = Math.round(mtbf / 24);
    if (anomaly >= 60) rulDays = Math.max(1, Math.round(rulDays * 0.35));
    else if (anomaly >= 40) rulDays = Math.max(2, Math.round(rulDays * 0.55));
    else if (anomaly >= 25) rulDays = Math.max(3, Math.round(rulDays * 0.75));
    if (st.status === 'Down') rulDays = 0;

    let band = 'excellent';
    if (health < 40) band = 'critical';
    else if (health < 55) band = 'poor';
    else if (health < 70) band = 'fair';
    else if (health < 85) band = 'good';

    return {
      health, band, anomaly: Math.round(anomaly), rulDays,
      mtbf: Number(mtbf.toFixed(1)), mttr: Number(mttr.toFixed(1)),
      status: st.status, availability: avail, failures: fails, downtime
    };
  }
  window.getReliabilityMetrics = getReliabilityMetrics;

  function populateReliabilityCenter() {
    const ids = collectFilteredIds ? collectFilteredIds() : [...new Set(getFilteredEquipment().map(e => String(e.id)))];
    const metrics = ids.map(id => {
      const eq = (equipment || []).find(e => String(e.id) === String(id));
      const m = getReliabilityMetrics(id);
      return { id, eq, ...m };
    });
    metrics.sort((a, b) => a.health - b.health);

    const avgHealth = metrics.length ? (metrics.reduce((s, m) => s + m.health, 0) / metrics.length).toFixed(1) : '100';
    const critical = metrics.filter(m => m.health < 40).length;
    const highAnomaly = metrics.filter(m => m.anomaly >= 40).length;
    const avgMtbf = metrics.length ? (metrics.reduce((s, m) => s + m.mtbf, 0) / metrics.length).toFixed(0) : '—';
    const avgMttr = metrics.length ? (metrics.reduce((s, m) => s + m.mttr, 0) / metrics.length).toFixed(1) : '—';

    const kpi = document.getElementById('reliability-kpi-grid');
    if (kpi) {
      kpi.innerHTML = `
        <div class="kpi-card green enterprise-kpi"><i class="fas fa-heartbeat"></i><h2>${avgHealth}</h2><p>Avg Fleet Health</p></div>
        <div class="kpi-card red"><i class="fas fa-skull-crossbones"></i><h2>${critical}</h2><p>Critical Health (&lt;40)</p></div>
        <div class="kpi-card orange"><i class="fas fa-percentage"></i><h2>${highAnomaly}</h2><p>High Anomaly Score</p></div> 
        <div class="kpi-card blue"><i class="fas fa-clock"></i><h2>${avgMtbf}h</h2><p>Avg MTBF</p></div>
        <div class="kpi-card purple"><i class="fas fa-wrench"></i><h2>${avgMttr}h</h2><p>Avg MTTR</p></div>
        <div class="kpi-card blue"><i class="fas fa-cogs"></i><h2>${metrics.length}</h2><p>Assets scored</p></div>
      `;
    }

    const tbody = document.getElementById('health-score-tbody');
    if (tbody) {
      if (!metrics.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:var(--text-3);">No equipment in filter.</td></tr>';
      } else {
        tbody.innerHTML = metrics.slice(0, 80).map(m => {
          const type = m.eq ? inferEquipmentType(m.eq) : inferEquipmentType(m.id);
          const esc = String(m.id).replace(/'/g, "\\'");
          return `<tr class="row-clickable" onclick="showEquipmentDetail('${esc}')">
            <td><strong>${String(m.id).replace(/</g,'&lt;')}</strong></td>
            <td>${type}</td>
            <td>${(m.eq?.shaft || '—').replace(/</g,'&lt;')}</td>
            <td><span class="health-score ${m.band}">${m.health}</span></td>
            <td>${m.rulDays === 0 ? '<span style="color:var(--danger);font-weight:700;">0 (Down)</span>' : m.rulDays}</td>
            <td style="font-weight:700;color:${m.anomaly>=50?'#dc2626':m.anomaly>=30?'#ea580c':'#16a34a'}">${m.anomaly}</td>
            <td>${m.mtbf}</td>
            <td>${m.mttr}</td>
            <td style="font-weight:700;color:${m.status==='Down'?'#dc2626':'#16a34a'}">${m.status}</td>
          </tr>`;
        }).join('');
      }
    }

    // Charts
    const bands = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
    metrics.forEach(m => { bands[m.band] = (bands[m.band] || 0) + 1; });
    if (window.Chart) {
      const hc = document.getElementById('healthDistChart');
      if (hc) {
        if (window._healthDistChart) window._healthDistChart.destroy();
        window._healthDistChart = new Chart(hc, {
          type: 'doughnut',
          data: {
            labels: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'],
            datasets: [{ data: [bands.excellent, bands.good, bands.fair, bands.poor, bands.critical], backgroundColor: ['#16a34a','#65a30d','#ea580c','#dc2626','#7f1d1d'], borderWidth: 2, borderColor: '#fff' }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
      }
      const ac = document.getElementById('anomalyChart');
      if (ac) {
        if (window._anomalyChart) window._anomalyChart.destroy();
        const top = metrics.slice().sort((a,b) => b.anomaly - a.anomaly).slice(0, 15);
        window._anomalyChart = new Chart(ac, {
          type: 'bar',
          data: { labels: top.map(m => m.id), datasets: [{ data: top.map(m => m.anomaly), backgroundColor: top.map(m => m.anomaly >= 50 ? '#dc2626' : m.anomaly >= 30 ? '#ea580c' : '#1d4ed8'), borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
        });
      }
    }

    const rec = document.getElementById('reliability-recommendations');
    if (rec) {
      const items = [];
      metrics.filter(m => m.health < 40).slice(0, 5).forEach(m => {
        items.push(`<div class="alert-banner alert-high-risk" style="margin:0;"><strong>${m.id}</strong> — Critical health (${m.health}). Prioritise inspection; estimated RUL ${m.rulDays} day(s). Anomaly ${m.anomaly}.</div>`);
      });
      metrics.filter(m => m.anomaly >= 45 && m.health >= 40).slice(0, 4).forEach(m => {
        items.push(`<div class="alert-banner alert-predictive" style="margin:0;"><strong>${m.id}</strong> — Elevated anomaly (${m.anomaly}). Review recurring failure modes in Text Mining.</div>`);
      });
      if (!items.length) items.push(`<div class="alert-banner" style="border-left-color:var(--success);background:rgba(22,163,74,0.08);color:#166534;margin:0;">No critical reliability actions under current filter. Continue scheduled maintenance and monitor trend.</div>`);
      rec.innerHTML = items.join('');
    }
  }
  window.populateReliabilityCenter = populateReliabilityCenter;

  function refreshAuditLog() {
    const body = document.getElementById('audit-log-body');
    if (!body) return;
    if (!auditEvents.length) {
      body.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--text-3);">No audit events yet. Actions such as import, status updates, mark-fixed and equipment changes will appear here.</div>';
      return;
    }
    body.innerHTML = auditEvents.slice(0, 200).map(e => `
      <div class="audit-row">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:0.5rem;">
          <strong>${String(e.action||'').replace(/</g,'&lt;')}</strong>
          <span style="color:var(--text-3);font-size:0.8rem;">${e.ts ? new Date(e.ts).toLocaleString('en-ZA') : '—'}</span>
        </div>
        <div style="color:var(--text-2);margin-top:0.2rem;">${String(e.detail||'').replace(/</g,'&lt;')}</div>
        <div style="font-size:0.78rem;color:var(--text-3);margin-top:0.25rem;">
          By: ${String(e.by||'—').replace(/</g,'&lt;')} · Role: ${e.role||'—'}
          ${e.equipmentId ? ' · Equip: ' + String(e.equipmentId).replace(/</g,'&lt;') : ''}
        </div>
      </div>`).join('');
  }
  window.refreshAuditLog = refreshAuditLog;

  window.exportReliabilityPDF = function() {
    if (typeof createExecutivePDF !== 'function') return showToast('PDF engine not ready', 'error');
    const { doc, addFooter, startY } = createExecutivePDF('Reliability Center – Fleet Health', getActiveFilterLabel() || 'All Shafts · All Types');
    const ids = collectFilteredIds ? collectFilteredIds() : [];
    const rows = ids.slice(0, 40).map(id => {
      const m = getReliabilityMetrics(id);
      return [id, String(m.health), String(m.rulDays), String(m.anomaly), String(m.mtbf), String(m.mttr), m.status];
    });
    doc.autoTable({
      startY,
      head: [['Equipment', 'Health', 'RUL (d)', 'Anomaly', 'MTBF (h)', 'MTTR (h)', 'Status']],
      body: rows,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
      margin: { left: 14, right: 14 }
    });
    addFooter(1);
    doc.save('RBE_Reliability_Center.pdf');
  };
  window.exportAuditExcel = function() {
    if (typeof downloadXLSX !== 'function') return;
    downloadXLSX('RBE_Audit_Trail.xlsx', [{
      name: 'Audit',
      headers: ['Timestamp', 'Action', 'Detail', 'Equipment', 'By', 'Role'],
      rows: auditEvents.map(e => [e.ts, e.action, e.detail, e.equipmentId, e.by, e.role])
    }]);
  };
  window.exportAuditPDF = function() {
    if (typeof createExecutivePDF !== 'function') return;
    const { doc, addFooter, startY } = createExecutivePDF('Audit Trail', 'Privileged & change events');
    const rows = auditEvents.slice(0, 60).map(e => [
      e.ts ? new Date(e.ts).toLocaleString('en-ZA') : '',
      e.action || '',
      (e.detail || '').slice(0, 60),
      e.by || '',
      e.role || ''
    ]);
    doc.autoTable({
      startY,
      head: [['Time', 'Action', 'Detail', 'By', 'Role']],
      body: rows,
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      margin: { left: 14, right: 14 }
    });
    addFooter(1);
    doc.save('RBE_Audit_Trail.pdf');
  };

  // ── Navigation ───────────────────────────────────────────────
  function show(section) {
    // Leaving a section closes any open cards so navigation stays clean
    if (typeof closeAllModals === 'function') closeAllModals();
    if (section === 'import-spreadsheet' && !can('import')) {
      showToast('Import is restricted for your role', 'error');
      return;
    }
    if (section === 'text-mining' && !can('text_mining')) {
      showToast('Text Mining is restricted for your role', 'error');
      return;
    }
    if (section === 'add-equipment' && !can('add_equipment')) {
      showToast('Adding equipment is restricted for your role', 'error');
      return;
    }
    if (section === 'audit-log' && !(currentUserRole === 'admin' || currentUserRole === 'executive')) {
      showToast('Audit Trail is restricted to admin / executive roles', 'error');
      return;
    }
    if (section === 'user-admin' && currentUserRole !== 'admin') {
      showToast('User Management is restricted to administrators', 'error');
      return;
    }
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(section);
    if (el) el.classList.remove('hidden');
    document.querySelectorAll('#sidebar-menu li').forEach(li => li.classList.remove('active'));
    const menuItem = document.querySelector(`[data-section="${section}"]`);
    if (menuItem) menuItem.classList.add('active');
    if (window.innerWidth < 1025) {
      const sb = document.getElementById('sidebar');
      if (sb) sb.classList.remove('open');
      const cm = document.getElementById('sidebar-close-mobile');
      if (cm) cm.style.display = 'none';
    }
    refreshCurrentView();
  }
  window.show = show;

  function refreshCurrentView() {
    const section = document.querySelector('section:not(.hidden)')?.id;
    if (!section) return;
    try {
      if (section === 'dashboard') { populateDashboard(); updatePredictiveNotifications(); }
      else if (section === 'manage-equipment') populateEquipmentTable();
      else if (section === 'maintenance-schedule') populateMaintTable();
      else if (section === 'calendar') initCalendar();
      else if (section === 'operations-report') populateOperationsReport();
      else if (section === 'text-mining') refreshTextMiningInsights();
      else if (section === 'reliability-center') populateReliabilityCenter();
      else if (section === 'audit-log') refreshAuditLog();
      else if (section === 'user-admin') refreshUserAdminList();
    } catch (e) { console.warn(e); }
  }
  window.refreshCurrentView = refreshCurrentView;

  document.querySelectorAll('#sidebar-menu li').forEach(li => {
    li.addEventListener('click', () => {
      if (li.id === 'logout-btn') return;
      if (li.classList.contains('menu-group-label')) return;
      if (!li.dataset.section) return;
      show(li.dataset.section);
      // Close mobile drawer after navigation
      const sb = document.getElementById('sidebar');
      if (sb && window.innerWidth <= 1024) {
        sb.classList.remove('open');
        const cm = document.getElementById('sidebar-close-mobile');
        if (cm) cm.style.display = 'none';
      }
    });
  });

  // ── Dashboard trend series (availability ↑/↓ & downtime improvement) ──
  function getTrendPeriodConfig() {
    const period = document.getElementById('trend-period')?.value || 'weekly';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const buckets = [];
    if (period === 'daily') {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.push({ key, label: key.slice(5), start: new Date(d), end: new Date(d.getTime() + 86400000 - 1) });
      }
    } else if (period === 'weekly') {
      // ISO-ish week buckets: last 12 weeks ending this week
      const day = now.getDay() || 7; // Mon=1..Sun=7 style
      const thisMonday = new Date(now); thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      for (let i = 11; i >= 0; i--) {
        const start = new Date(thisMonday); start.setDate(thisMonday.getDate() - i * 7);
        const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        const key = start.toISOString().slice(0, 10);
        buckets.push({ key, label: 'W' + key.slice(5), start, end });
      }
    } else if (period === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const key = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0');
        buckets.push({ key, label: key, start, end });
      }
    } else {
      // quarterly – last 8 quarters
      const q = Math.floor(now.getMonth() / 3);
      for (let i = 7; i >= 0; i--) {
        let y = now.getFullYear();
        let qq = q - i;
        while (qq < 0) { qq += 4; y -= 1; }
        const start = new Date(y, qq * 3, 1);
        const end = new Date(y, qq * 3 + 3, 0, 23, 59, 59, 999);
        const key = y + '-Q' + (qq + 1);
        buckets.push({ key, label: key, start, end });
      }
    }
    return { period, buckets };
  }

  function parseUpdateDate(u) {
    const d = String(u.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const t = String(u.time || '12:00').slice(0, 5);
    const dt = new Date(d + 'T' + (t.length === 5 ? t : '12:00') + ':00');
    return isNaN(dt.getTime()) ? null : dt;
  }

  function isDownLike(u) {
    const s = String(u.status || '').toLowerCase();
    return u.isFailure === '1' || u.isFailure === 1 || s === 'down' || s === 'offline' || s === 'failed' || s === 'broken';
  }

  function isFixedLike(u) {
    const s = String(u.status || '').toLowerCase();
    if (s === 'fixed' || s === 'up' || s === 'operational') return true;
    return typeof isAttendedOrFixed === 'function' && isAttendedOrFixed(u.reason || u.fault || '', u.status);
  }

  /**
   * Build per-bucket series:
   * - availabilityPct: estimated fleet availability for events in bucket
   * - downtimeHours: sum of downtimeHours logged in bucket
   * - breakdowns: count of Down/failure events
   * - closures: count of Fixed/attended events
   * - avgCloseHours: average downtime on closed events (when downtimeHours present)
   */
  function computeTrendSeries() {
    const { period, buckets } = getTrendPeriodConfig();
    const filteredUp = getFilteredUpdates();
    const filteredEq = getFilteredEquipment();
    const fleetSize = Math.max(1, filteredEq.length || new Set(filteredUp.map(u => u.equipmentId || u.locoNumber).filter(Boolean)).size || 1);

    const series = buckets.map(b => ({
      key: b.key, label: b.label,
      availabilityPct: null,
      downtimeHours: 0,
      breakdowns: 0,
      closures: 0,
      closeHoursSum: 0,
      closeHoursN: 0
    }));

    filteredUp.forEach(u => {
      const dt = parseUpdateDate(u);
      if (!dt) return;
      const idx = buckets.findIndex(b => dt >= b.start && dt <= b.end);
      if (idx < 0) return;
      const row = series[idx];
      const downH = Number(u.downtimeHours || u.downtime || 0) || 0;
      if (isDownLike(u)) {
        row.breakdowns += 1;
        row.downtimeHours += downH;
      }
      if (isFixedLike(u)) {
        row.closures += 1;
        if (downH > 0) {
          row.closeHoursSum += downH;
          row.closeHoursN += 1;
        }
      }
    });

    // Availability proxy per bucket:
    // start from 100%, subtract (downtimeHours / (fleetSize * periodHours)) * 100, clamp 0-100
    series.forEach((row, i) => {
      const b = buckets[i];
      const periodHours = Math.max(1, (b.end - b.start) / 3600000);
      const capacity = fleetSize * periodHours;
      const lostPct = capacity > 0 ? (row.downtimeHours / capacity) * 100 : 0;
      // Also penalise open breakdowns without downtime hours (assume 4h each if no hours logged)
      const assumed = row.breakdowns > 0 && row.downtimeHours === 0 ? row.breakdowns * 4 : 0;
      const lost2 = capacity > 0 ? ((row.downtimeHours + assumed) / capacity) * 100 : 0;
      let avail = 100 - Math.min(100, lost2);
      // If no activity in bucket, leave as null (gap) unless we want 100
      if (row.breakdowns === 0 && row.closures === 0 && row.downtimeHours === 0) {
        row.availabilityPct = null; // chart will skip / use previous
      } else {
        row.availabilityPct = Number(Math.max(0, Math.min(100, avail)).toFixed(1));
      }
      row.avgCloseHours = row.closeHoursN > 0 ? Number((row.closeHoursSum / row.closeHoursN).toFixed(1)) : null;
    });

    // Forward-fill availability for empty buckets (stable trend line)
    let lastAvail = 100;
    series.forEach(row => {
      if (row.availabilityPct == null) row.availabilityPct = lastAvail;
      else lastAvail = row.availabilityPct;
    });

    return { period, series, fleetSize };
  }

  function trendDirection(values, higherIsBetter) {
    const nums = values.filter(v => v != null && !isNaN(v));
    if (nums.length < 2) return { dir: 'flat', delta: 0, label: 'Insufficient data', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
    // Compare average of first third vs last third
    const n = nums.length;
    const a = Math.max(1, Math.floor(n / 3));
    const first = nums.slice(0, a).reduce((s, v) => s + v, 0) / a;
    const last = nums.slice(n - a).reduce((s, v) => s + v, 0) / a;
    const delta = last - first;
    const abs = Math.abs(delta);
    if (abs < 0.5) return { dir: 'flat', delta, label: 'Stable', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
    const improving = higherIsBetter ? delta > 0 : delta < 0;
    if (improving) {
      return { dir: 'up', delta, label: higherIsBetter ? 'Improving ↑' : 'Improving ↓', color: '#166534', bg: 'rgba(22,163,74,0.15)' };
    }
    return { dir: 'down', delta, label: higherIsBetter ? 'Declining ↓' : 'Worsening ↑', color: '#991b1b', bg: 'rgba(220,38,38,0.12)' };
  }

  function renderTrendCharts() {
    const { series } = computeTrendSeries();
    const labels = series.map(s => s.label);
    const availData = series.map(s => s.availabilityPct);
    const downData = series.map(s => Number(s.downtimeHours.toFixed(1)));
    const closeData = series.map(s => s.closures);
    const breakdownData = series.map(s => s.breakdowns);

    const availDir = trendDirection(availData, true);
    const delayDir = trendDirection(downData, false); // lower downtime = better

    const availBadge = document.getElementById('avail-trend-badge');
    if (availBadge) {
      availBadge.textContent = availDir.label + (Math.abs(availDir.delta) >= 0.5 ? ` (${availDir.delta > 0 ? '+' : ''}${availDir.delta.toFixed(1)} pts)` : '');
      availBadge.style.color = availDir.color;
      availBadge.style.background = availDir.bg;
    }
    const delayBadge = document.getElementById('delay-trend-badge');
    if (delayBadge) {
      delayBadge.textContent = delayDir.label + (Math.abs(delayDir.delta) >= 0.5 ? ` (${delayDir.delta > 0 ? '+' : ''}${delayDir.delta.toFixed(1)} h)` : '');
      delayBadge.style.color = delayDir.color;
      delayBadge.style.background = delayDir.bg;
    }

    const chips = document.getElementById('trend-summary-chips');
    if (chips) {
      const totalDown = downData.reduce((a, b) => a + b, 0);
      const totalBd = breakdownData.reduce((a, b) => a + b, 0);
      const totalCl = closeData.reduce((a, b) => a + b, 0);
      chips.innerHTML = `
        <span class="filter-chip" style="background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);">${labels.length} periods</span>
        <span class="filter-chip" style="background:rgba(29,78,216,0.1);color:#1e3a8a;border:1px solid rgba(29,78,216,0.25);">Σ downtime ${totalDown.toFixed(1)} h</span>
        <span class="filter-chip" style="background:rgba(220,38,38,0.08);color:#991b1b;border:1px solid rgba(220,38,38,0.2);">${totalBd} breakdowns</span>
        <span class="filter-chip" style="background:rgba(22,163,74,0.1);color:#166534;border:1px solid rgba(22,163,74,0.25);">${totalCl} closures</span>
      `;
    }

    function lineChart(canvasId, datasets, yBeginZero, ySuggestedMax) {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !window.Chart) return;
      if (charts[canvasId]) charts[canvasId].destroy();
      charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels.length ? labels : ['No data'], datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` } }
          },
          scales: {
            y: {
              beginAtZero: !!yBeginZero,
              suggestedMax: ySuggestedMax,
              ticks: { precision: 0 },
              grid: { color: 'rgba(148,163,184,0.25)' }
            },
            x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } }
          }
        }
      });
    }

    lineChart('availTrendChart', [{
      label: 'Fleet availability %',
      data: availData.length ? availData : [100],
      borderColor: '#1d4ed8',
      backgroundColor: 'rgba(29,78,216,0.12)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#1d4ed8',
      borderWidth: 2
    }], false, 100);

    lineChart('delayTrendChart', [
      {
        label: 'Downtime hours',
        data: downData.length ? downData : [0],
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#dc2626',
        borderWidth: 2,
        yAxisID: 'y'
      },
      {
        label: 'Breakdowns opened',
        data: breakdownData.length ? breakdownData : [0],
        borderColor: '#ea580c',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.25,
        pointRadius: 2,
        borderWidth: 2,
        borderDash: [5, 4],
        yAxisID: 'y'
      },
      {
        label: 'Closures (fixed)',
        data: closeData.length ? closeData : [0],
        borderColor: '#16a34a',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.25,
        pointRadius: 2,
        borderWidth: 2,
        yAxisID: 'y'
      }
    ], true, undefined);
  }
  window.renderTrendCharts = renderTrendCharts;
  window.onTrendPeriodChange = function() {
    try { renderTrendCharts(); } catch (e) { console.warn(e); }
  };

  // ── Dashboard ────────────────────────────────────────────────
  function populateDashboard() {
    const filteredEq = getFilteredEquipment();
    const filteredUp = getFilteredUpdates();
    const idSet = new Set(filteredEq.map(e => String(e.id)));
    filteredUp.forEach(u => { if (u.equipmentId) idSet.add(String(u.equipmentId)); });
    const ids = [...idSet].filter(Boolean);

    let upCount = 0, downCount = 0, totalAvail = 0, totalFails = 0;
    ids.forEach(id => {
      const st = getEquipmentStatus(id);
      if (st.status === 'Up') upCount++; else downCount++;
      totalAvail += parseFloat(st.availability) || 0;
      totalFails += st.failures || 0;
    });
    const avgAvail = ids.length ? (totalAvail / ids.length).toFixed(1) : '100.0';
    const operationalPct = ids.length ? ((upCount / ids.length) * 100).toFixed(1) : '100.0';

    const kpiGrid = document.getElementById('kpi-grid');
    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi-card blue clickable" onclick="showKpiEquipmentList('all')" title="Click to view equipment list"><i class="fas fa-cogs"></i><h2>${ids.length}</h2><p>Total Equipment</p></div>
        <div class="kpi-card green clickable" onclick="showKpiEquipmentList('up')" title="Click to view operational equipment"><i class="fas fa-check-circle"></i><h2>${upCount}</h2><p>Operational (Up)</p></div>
        <div class="kpi-card red clickable" onclick="showKpiEquipmentList('down')" title="Click to view down equipment"><i class="fas fa-exclamation-circle"></i><h2>${downCount}</h2><p>Down</p></div>
        <div class="kpi-card purple clickable" onclick="showKpiEquipmentList('all')" title="Click to view fleet"><i class="fas fa-percentage"></i><h2>${avgAvail}%</h2><p>Fleet Availability</p></div>
        <div class="kpi-card orange clickable" onclick="showKpiEquipmentList('failures')" title="Click to view equipment with failures"><i class="fas fa-bolt"></i><h2>${totalFails}</h2><p>Total Failures</p></div>
        <div class="kpi-card blue clickable" onclick="showKpiEquipmentList('up')" title="Click to view operational equipment"><i class="fas fa-tachometer-alt"></i><h2>${operationalPct}%</h2><p>Operational %</p></div>
      `;
    }

    const availLabels = [], availData = [], failLabels = [], failData = [], mttfLabels = [], mttfData = [];
    ids.slice(0, 25).forEach(id => {
      const st = getEquipmentStatus(id);
      availLabels.push(id); availData.push(parseFloat(st.availability) || 0);
      failLabels.push(id); failData.push(st.failures || 0);
      const eu = filteredUp.filter(u => String(u.equipmentId || '') === id);
      const fails = Math.max(1, st.failures || 1);
      const dates = eu.map(u => u.date).filter(Boolean).sort();
      let mttf = 24;
      if (dates.length >= 2) {
        const hours = Math.max(24, (new Date(dates[dates.length - 1]) - new Date(dates[0])) / 3600000 + 24);
        const downH = eu.reduce((s, u) => s + (Number(u.downtimeHours || 0) || 0), 0);
        mttf = Math.max(1, (hours - downH) / fails);
      }
      mttfLabels.push(id); mttfData.push(Number(mttf.toFixed(1)));
    });

    function makeChart(canvasId, type, labels, data, color) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      if (charts[canvasId]) charts[canvasId].destroy();
      charts[canvasId] = new Chart(canvas, {
        type,
        data: { labels: labels.length ? labels : ['No data'], datasets: [{ data: data.length ? data : [0], backgroundColor: color, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: type === 'bar' ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {} }
      });
    }
    makeChart('availabilityChart', 'bar', availLabels, availData, '#1d4ed8');
    makeChart('failuresChart', 'bar', failLabels, failData, '#dc2626');
    makeChart('mttfChart', 'bar', mttfLabels, mttfData, '#16a34a');

    try { renderTrendCharts(); } catch (e) { console.warn('Trend charts', e); }
    renderUpcomingMaintenance();
  }

  function renderUpcomingMaintenance() {
    const list = getFilteredMaintenance();
    const items = list.map(m => {
      const days = m.dueDate ? Math.ceil((new Date(m.dueDate) - new Date()) / 86400000) : calculateDaysLeft(m.lastDone, m.interval);
      return { ...m, days };
    }).filter(m => !isNaN(m.days)).sort((a, b) => a.days - b.days);
    window._lastUpcomingMaint = items;
    const rows = items.map((m, idx) => {
      const color = m.days < 0 ? 'var(--danger)' : (m.days <= 7 ? 'var(--warning)' : 'var(--success)');
      const label = m.days < 0 ? Math.abs(m.days) + ' overdue' : m.days + ' days left';
      const src = m.source === 'failure-pattern' ? 'Predictive' : 'Manual';
      return `<div class="maint-item-clickable" style="display:flex;justify-content:space-between;align-items:center;padding:0.65rem 0.9rem;background:var(--surface-2);border-radius:8px;border-left:4px solid ${color};" onclick="showUpcomingMaintDetail(${idx})" title="Click for details">
        <div><strong>${String(m.equipment||'').replace(/</g,'&lt;')}</strong> – ${String(m.task || 'Task').replace(/</g,'&lt;')} <span style="font-size:0.85rem;color:var(--text-3);">(${src})</span></div>
        <div style="font-weight:700;color:${color};">${label}</div>
      </div>`;
    });
    const listEl = document.getElementById('maintenance-list');
    if (listEl) {
      window._tableFullRows['upcoming'] = rows;
      const expanded = !!window._tableExpandState['upcoming'];
      listEl.innerHTML = (expanded ? rows : rows.slice(0, 10)).join('') || '<div style="padding:1rem;color:var(--text-3);">No upcoming tasks.</div>';
      const wrap = document.getElementById('upcoming-view-more-wrap');
      const btn = document.getElementById('upcoming-view-more-btn');
      if (wrap && btn) {
        if (rows.length > 10) {
          wrap.style.display = 'block';
          btn.textContent = expanded ? `Show less` : `View more (${rows.length - 10} more)`;
        } else wrap.style.display = 'none';
      }
    }
  }

  // ── Detail / list popups ─────────────────────────────────────
  function collectFilteredIds() {
    const filteredEq = getFilteredEquipment();
    const filteredUp = getFilteredUpdates();
    const idSet = new Set(filteredEq.map(e => String(e.id)));
    filteredUp.forEach(u => { if (u.equipmentId) idSet.add(String(u.equipmentId)); });
    return [...idSet].filter(Boolean).sort();
  }

  function showKpiEquipmentList(mode) {
    const ids = collectFilteredIds();
    let filtered = ids.map(id => {
      const st = getEquipmentStatus(id);
      const eq = (equipment || []).find(e => String(e.id) === String(id));
      return { id, st, eq };
    });
    let title = 'Total Equipment';
    if (mode === 'up') {
      filtered = filtered.filter(x => x.st.status === 'Up');
      title = 'Operational (Up) Equipment';
    } else if (mode === 'down') {
      filtered = filtered.filter(x => x.st.status === 'Down');
      title = 'Down Equipment';
    } else if (mode === 'failures') {
      filtered = filtered.filter(x => (x.st.failures || 0) > 0).sort((a, b) => (b.st.failures || 0) - (a.st.failures || 0));
      title = 'Equipment with Failures';
    }
    const titleEl = document.getElementById('equip-list-title');
    const summaryEl = document.getElementById('equip-list-summary');
    const tbody = document.getElementById('equip-list-tbody');
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-list"></i> ${title}`;
    if (summaryEl) summaryEl.textContent = `${filtered.length} unit(s)` + (getActiveFilterLabel() ? ` · Filter: ${getActiveFilterLabel()}` : '');
    if (tbody) {
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-3);">No equipment in this category.</td></tr>';
      } else {
        tbody.innerHTML = filtered.map(x => {
          const type = x.eq ? inferEquipmentType(x.eq) : inferEquipmentType(x.id);
          const statusColor = x.st.status === 'Down' ? '#dc2626' : '#16a34a';
          const escId = String(x.id).replace(/'/g, "\\'");
          return `<tr class="row-clickable" onclick="showEquipmentDetail('${escId}')">
            <td><strong>${String(x.id).replace(/</g,'&lt;')}</strong></td>
            <td>${type}</td>
            <td>${(x.eq?.shaft || '—').replace(/</g,'&lt;')}</td>
            <td style="font-weight:700;color:${statusColor};">${x.st.status}</td>
            <td>${x.st.availability}%</td>
            <td>${x.st.failures || 0}</td>
            <td>${(x.st.downtime || 0).toFixed(1)}</td>
          </tr>`;
        }).join('');
      }
    }
    openModal('equip-list-modal');
  }
  window.showKpiEquipmentList = showKpiEquipmentList;

  function showEquipmentDetail(id) {
    const eq = (equipment || []).find(e => String(e.id) === String(id));
    const st = getEquipmentStatus(id);
    const euRaw = getFilteredUpdates().filter(u => String(u.equipmentId || u.locoNumber || '') === String(id))
      .sort((a, b) => String((b.date||'')+' '+(b.time||'')).localeCompare(String((a.date||'')+' '+(a.time||''))));
    // De-dupe identical status events so audit trail does not repeat the same task
    const euSeen = new Set();
    const eu = [];
    for (const u of euRaw) {
      const key = statusUpdateFingerprint(u);
      if (euSeen.has(key)) continue;
      euSeen.add(key);
      eu.push(u);
    }
    const last = eu[0];
    const titleEl = document.getElementById('equip-detail-title');
    const body = document.getElementById('equip-detail-body');
    const actions = document.getElementById('equip-detail-actions');
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-id-card"></i> ${String(id).replace(/</g,'&lt;')}`;
    const fields = [
      ['Equipment ID', id],
      ['Type', eq ? inferEquipmentType(eq) : inferEquipmentType(id)],
      ['Operation / Shaft', eq?.shaft || '—'],
      ['Work Place', eq?.level || '—'],
      ['Size', eq?.locoSize || '—'],
      ['SECTION', eq?.section || '—'],
      ['OEM', eq?.oem || eq?.OEM || '—'],
      ['Current Status', st.status],
      ['Availability', st.availability + '%'],
      ['Total Failures', String(st.failures || 0)],
      ['Total Downtime (h)', (st.downtime || 0).toFixed(1)],
      ['Color Risk', st.color || '—'],
      ['Last Update', st.lastUpdate || '—'],
      ['Last Reason / Fault', st.lastReason || last?.reason || '—'],
      ['Last changed by', last ? personFromUpdate(last, 'changed') : '—'],
      ['Status History Events', String(eu.length)]
    ];
    const auditHtml = `<div class="audit-trail">
      <h4><i class="fas fa-history"></i> Audit trail (who / when)</h4>
      ${eu.length ? eu.slice(0, 12).map(u => {
        const reported = personFromUpdate(u, 'reported');
        const signed = personFromUpdate(u, 'signed');
        const changed = personFromUpdate(u, 'changed');
        const when = [u.date, u.time].filter(Boolean).join(' ') || '—';
        const status = u.status || '—';
        const reason = String(u.reason || u.fault || '').slice(0, 120);
        const whoBits = [];
        if (reported && reported !== '—') whoBits.push('Reported: ' + reported);
        if (signed && signed !== '—') whoBits.push('Signed: ' + signed);
        if (changed && changed !== '—') whoBits.push('Changed: ' + changed);
        const whoLine = whoBits.length ? whoBits.join(' · ') : 'Unknown';
        return `<div class="audit-item">
          <div><strong>${String(status).replace(/</g,'&lt;')}</strong> · ${String(reason).replace(/</g,'&lt;') || '—'}</div>
          <div class="audit-meta"><i class="fas fa-user"></i> ${String(whoLine).replace(/</g,'&lt;')}<br><i class="fas fa-clock"></i> ${when}${u.source ? ' · ' + String(u.source).replace(/</g,'&lt;') : ''}</div>
        </div>`;
      }).join('') : '<p style="color:var(--text-3);font-size:0.9rem;">No status history yet.</p>'}
    </div>`;
    if (body) {
      body.innerHTML = fields.map(([k, v]) => `<div style="background:var(--surface-2);border-radius:8px;padding:0.65rem 0.85rem;border:1px solid var(--border);">
        <div style="font-size:0.78rem;color:var(--text-3);font-weight:600;text-transform:uppercase;margin-bottom:0.25rem;">${k}</div>
        <div style="font-weight:600;word-break:break-word;">${String(v == null || v === '' ? '—' : v).replace(/</g,'&lt;')}</div>
      </div>`).join('') + auditHtml;
    }
    const escId = String(id).replace(/'/g, "\\'");
    if (actions) {
      let btns = `<button type="button" class="btn btn-primary" onclick="closeAllModals();show('search-status');document.getElementById('s-loco').value='${escId}';document.getElementById('search-form').requestSubmit();"><i class="fas fa-search"></i> View History</button>`;
      if (can('mark_fixed')) {
        btns += `<button type="button" class="btn btn-success" onclick="markEquipmentFixed('${escId}','');closeModal('equip-detail-modal');"><i class="fas fa-check"></i> Mark Fixed</button>`;
      }
      if (can('edit_equipment')) {
        btns += `<button type="button" class="btn btn-primary" onclick="openEditEquipment('${escId}');"><i class="fas fa-edit"></i> Edit Register</button>`;
      }
      actions.innerHTML = btns;
    }
    openModal('equip-detail-modal');  /* keep equip-list under stack for back sequence */
  }
  window.showEquipmentDetail = showEquipmentDetail;

  function showUpcomingMaintDetail(idx) {
    const m = (window._lastUpcomingMaint || [])[idx];
    if (!m) return;
    const days = m.days;
    const dueLabel = days < 0 ? Math.abs(days) + ' day(s) overdue' : days + ' day(s) left';
    const dueDate = m.dueDate || calculateNextDue(m.lastDone, m.interval) || '—';
    const body = document.getElementById('equip-detail-body');
    const titleEl = document.getElementById('equip-detail-title');
    const actions = document.getElementById('equip-detail-actions');
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-wrench"></i> ${String(m.equipment||'').replace(/</g,'&lt;')} – Maintenance`;
    const fields = [
      ['Equipment', m.equipment],
      ['Task', m.task || '—'],
      ['Interval', m.interval || '—'],
      ['Last Done', m.lastDone || '—'],
      ['Due Date', dueDate],
      ['Days Left', dueLabel],
      ['Source', m.source === 'failure-pattern' ? 'Predictive' : 'Manual']
    ];
    if (body) {
      body.innerHTML = fields.map(([k, v]) => `<div style="background:var(--surface-2);border-radius:8px;padding:0.65rem 0.85rem;border:1px solid var(--border);">
        <div style="font-size:0.78rem;color:var(--text-3);font-weight:600;text-transform:uppercase;margin-bottom:0.25rem;">${k}</div>
        <div style="font-weight:600;word-break:break-word;">${String(v == null || v === '' ? '—' : v).replace(/</g,'&lt;')}</div>
      </div>`).join('');
    }
    const escEq = String(m.equipment || '').replace(/'/g, "\\'");
    const escId = String(m.id || '').replace(/'/g, "\\'");
    if (actions) {
      actions.innerHTML = `
        <button type="button" class="btn btn-success" onclick="markEquipmentFixed('${escEq}','${escId}');closeModal('equip-detail-modal');"><i class="fas fa-check"></i> Mark Fixed</button>
        <button type="button" class="btn btn-primary" onclick="showEquipmentDetail('${escEq}');"><i class="fas fa-id-card"></i> Equipment Profile</button>
        ${escId ? `<button type="button" class="btn btn-primary" onclick="dismissAlert('maint-${escId}');closeModal('equip-detail-modal');">Dismiss Alert</button>` : ''}
      `;
    }
    openModal('equip-detail-modal');
  }
  window.showUpcomingMaintDetail = showUpcomingMaintDetail;

  function showRowActions(title, buttonsHtml) {
    const titleEl = document.getElementById('row-actions-title');
    const body = document.getElementById('row-actions-body');
    if (titleEl) titleEl.textContent = title || 'Actions';
    if (body) body.innerHTML = buttonsHtml;
    openModal('row-actions-modal');
  }
  window.showRowActions = showRowActions;

  function showProblemEquipmentDetail(id) {
    showEquipmentDetail(id);
  }
  window.showProblemEquipmentDetail = showProblemEquipmentDetail;

  function showHighRiskDetail(id) {
    showEquipmentDetail(id);
  }
  window.showHighRiskDetail = showHighRiskDetail;

  function showBadActorDetail(id) {
    showEquipmentDetail(id);
  }
  window.showBadActorDetail = showBadActorDetail;

  // ── Alerts ───────────────────────────────────────────────────
  function isAlertDismissed(key) { return dismissedAlerts.has(key); }
  function dismissAlert(key) {
    dismissedAlerts.add(key);
    localStorage.setItem('rbe_dismissed', JSON.stringify([...dismissedAlerts]));
    updatePredictiveNotifications();
  }
  window.dismissAlert = dismissAlert;
  function clearAllDismissedAlerts() {
    dismissedAlerts.clear();
    localStorage.setItem('rbe_dismissed', '[]');
    updatePredictiveNotifications();
  }
  window.clearAllDismissedAlerts = clearAllDismissedAlerts;

  function analyseFailurePatterns() {
    const filteredUp = getFilteredUpdates();
    const byEquip = {};
    filteredUp.forEach(u => {
      const id = String(u.equipmentId || u.locoNumber || '').trim();
      if (!id || isUnknownEquipmentId(id)) return;
      if (!byEquip[id]) byEquip[id] = [];
      byEquip[id].push(u);
    });
    const patterns = [];
    Object.entries(byEquip).forEach(([id, rows]) => {
      const fails = rows.filter(u => {
        const s = String(u.status || '').toLowerCase();
        return u.isFailure === '1' || u.isFailure === 1 || s === 'down' || s === 'offline';
      });
      if (fails.length < 2) return;
      const dates = fails.map(u => u.date).filter(Boolean).sort();
      if (dates.length < 2) return;
      const gaps = [];
      for (let i = 1; i < dates.length; i++) gaps.push((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
      const avgDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const last = new Date(dates[dates.length - 1]);
      const predicted = new Date(last.getTime() + avgDays * 86400000);
      const daysUntil = Math.ceil((predicted - new Date()) / 86400000);
      const lastReason = fails[fails.length - 1]?.reason || '';
      const mode = tmClassifyReason(lastReason).mode;
      patterns.push({
        equipment: id, failures: fails.length, avgDaysBetween: avgDays.toFixed(1),
        lastBreakdown: dates[dates.length - 1], predictedNext: predicted.toISOString().slice(0, 10),
        daysUntil, topMode: mode, lastReason,
        task: `Predictive inspection – ${mode}`, focus: mode,
        actions: `Inspect ${mode} systems; review last fault; verify safety devices.`,
        priority: daysUntil < 0 ? 'CRITICAL' : (daysUntil <= 7 ? 'HIGH' : 'MEDIUM'),
        priorityColor: daysUntil < 0 ? '#dc2626' : (daysUntil <= 7 ? '#ea580c' : '#7c3aed')
      });
    });
    return patterns.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  function updatePredictiveNotifications() {
    const patterns = analyseFailurePatterns();
    const maint = getFilteredMaintenance();
    let overdue = 0, dueSoon = 0, patternCount = 0, highRisk = 0;
    const highList = document.getElementById('high-risk-list');
    const predList = document.getElementById('predictive-list');
    const failList = document.getElementById('failure-pattern-list');
    if (highList) highList.innerHTML = '';
    if (predList) predList.innerHTML = '';
    if (failList) failList.innerHTML = '';

    const ids = new Set(getFilteredEquipment().map(e => String(e.id)));
    getFilteredUpdates().forEach(u => { if (u.equipmentId) ids.add(String(u.equipmentId)); });
    [...ids].forEach(id => {
      if (isAlertDismissed('high-' + id)) return;
      const st = getEquipmentStatus(id);
      if (st.failures >= 2 || parseFloat(st.availability) < 85 || st.downtime > 48) {
        highRisk++;
        if (highList) highList.innerHTML += `<li class="alert-li-clickable" style="margin:0.4rem 0;display:flex;justify-content:space-between;gap:8px;align-items:center;" onclick="focusAlertTarget('high','${String(id).replace(/'/g,"\\'")}')">
          <span><strong>${id}</strong> – ${st.failures} failures · ${st.availability}% · ${st.downtime.toFixed(1)}h <span class="alert-focus-label">· View</span></span>
          <button class="btn btn-primary" style="padding:0.25rem 0.6rem;font-size:0.8rem;" onclick="event.stopPropagation();dismissAlert('high-${id}')">Dismiss</button></li>`;
      }
    });

    maint.forEach(m => {
      if (isAlertDismissed('maint-' + m.id)) return;
      const days = m.dueDate ? Math.ceil((new Date(m.dueDate) - new Date()) / 86400000) : calculateDaysLeft(m.lastDone, m.interval);
      if (isNaN(days)) return;
      if (days < 0) overdue++; else if (days <= 7) dueSoon++;
      if (m.source === 'failure-pattern') patternCount++;
      if (predList && days <= 14) {
        predList.innerHTML += `<li class="alert-li-clickable" style="margin:0.4rem 0;display:flex;justify-content:space-between;gap:8px;align-items:center;" onclick="focusAlertTarget('maint','${String(m.equipment||'').replace(/'/g,"\\'")}')">
          <span><strong>${m.equipment}</strong> – ${m.task} · ${days < 0 ? Math.abs(days) + ' overdue' : days + 'd left'} <span class="alert-focus-label">· Focus</span></span>
          <button class="btn btn-primary" style="padding:0.25rem 0.6rem;font-size:0.8rem;" onclick="event.stopPropagation();dismissAlert('maint-${m.id}')">Dismiss</button></li>`;
      }
    });

    patterns.forEach(p => {
      if (isAlertDismissed('fail-' + p.equipment)) return;
      patternCount++;
      if (failList) failList.innerHTML += `<li class="alert-li-clickable" style="margin:0.4rem 0;display:flex;justify-content:space-between;gap:8px;align-items:center;" onclick="focusAlertTarget('fail','${String(p.equipment||'').replace(/'/g,"\\'")}')">
        <span><strong>${p.equipment}</strong> – ${p.topMode} · ${p.predictedNext} (${p.daysUntil < 0 ? 'overdue' : p.daysUntil + 'd'}) · ${p.failures} fails <span class="alert-focus-label">· View</span></span>
        <button class="btn btn-primary" style="padding:0.25rem 0.6rem;font-size:0.8rem;" onclick="event.stopPropagation();dismissAlert('fail-${p.equipment}')">Dismiss</button></li>`;
    });

    const summary = document.getElementById('dashboard-alert-summary');
    const summaryText = document.getElementById('dash-alert-summary-text');
    if (summary && summaryText) {
      summaryText.textContent = `${overdue} Overdue | ${dueSoon} Due Soon | ${patternCount} Failure-pattern | ${highRisk} High-risk`;
      summary.classList.toggle('hidden', !(overdue + dueSoon + patternCount + highRisk));
    }
    document.getElementById('high-risk-alerts')?.classList.toggle('hidden', !highList?.innerHTML);
    document.getElementById('predictive-alerts')?.classList.toggle('hidden', !predList?.innerHTML);
    document.getElementById('failure-pattern-alerts')?.classList.toggle('hidden', !failList?.innerHTML);
  }
  window.updatePredictiveNotifications = updatePredictiveNotifications;

  function toggleDashAlertDetails() {
    const el = document.getElementById('dash-alert-details');
    if (!el) return;
    const collapsed = el.classList.toggle('collapsed');
    const btn = document.querySelector('#dashboard-alert-summary .btn-view-more');
    if (btn) btn.textContent = collapsed ? 'View details' : 'Hide details';
  }
  window.toggleDashAlertDetails = toggleDashAlertDetails;

  function calculateDaysLeft(lastDone, interval) {
    if (!lastDone) return NaN;
    const last = new Date(lastDone);
    let daysAdd = interval === 'weekly' ? 7 : (interval === 'quarterly' ? 90 : 30);
    return Math.ceil((new Date(last.getTime() + daysAdd * 86400000) - new Date()) / 86400000);
  }
  function calculateNextDue(lastDone, interval) {
    if (!lastDone) return '';
    const last = new Date(lastDone);
    let daysAdd = interval === 'weekly' ? 7 : (interval === 'quarterly' ? 90 : 30);
    return new Date(last.getTime() + daysAdd * 86400000).toISOString().slice(0, 10);
  }

  // ── Tables ───────────────────────────────────────────────────
  function toggleTableExpand(key) {
    window._tableExpandState[key] = !window._tableExpandState[key];
    const full = window._tableFullRows[key] || [];
    if (key === 'upcoming') {
      const expanded = !!window._tableExpandState[key];
      const listEl = document.getElementById('maintenance-list');
      if (listEl) listEl.innerHTML = (expanded ? full : full.slice(0, TABLE_PAGE_SIZE)).join('');
      const wrap = document.getElementById('upcoming-view-more-wrap');
      const btn = document.getElementById('upcoming-view-more-btn');
      if (wrap && btn && full.length > TABLE_PAGE_SIZE) {
        wrap.style.display = 'block';
        btn.textContent = expanded ? 'Show less' : `View more (${full.length - TABLE_PAGE_SIZE} more)`;
      }
      return;
    }
    renderPagedTable(key, full);
  }
  window.toggleTableExpand = toggleTableExpand;

  function renderPagedTable(key, rowsHtmlArray) {
    window._tableFullRows[key] = rowsHtmlArray || [];
    const expanded = !!window._tableExpandState[key];
    const rows = window._tableFullRows[key];
    const show = expanded ? rows : rows.slice(0, TABLE_PAGE_SIZE);
    const map = {
      equipment: '#equipment-table tbody', maint: '#maint-table tbody',
      problem: '#problem-equipment-tbody', highrisk: '#high-risk-tbody',
      'tm-bad': '#tm-bad-tbody', 'tm-recur': '#tm-recur-tbody'
    };
    const tbody = map[key] ? document.querySelector(map[key]) : null;
    if (tbody) tbody.innerHTML = show.join('') || '';
    const wrapMap = { equipment: 'equipment-view-more-wrap', maint: 'maint-view-more-wrap', problem: 'problem-view-more-wrap', highrisk: 'highrisk-view-more-wrap', 'tm-bad': 'tm-bad-view-more-wrap', 'tm-recur': 'tm-recur-view-more-wrap' };
    const btnMap = { equipment: 'equipment-view-more-btn', maint: 'maint-view-more-btn', problem: 'problem-view-more-btn', highrisk: 'highrisk-view-more-btn', 'tm-bad': 'tm-bad-view-more-btn', 'tm-recur': 'tm-recur-view-more-btn' };
    const wrap = document.getElementById(wrapMap[key]);
    const btn = document.getElementById(btnMap[key]);
    if (wrap && btn) {
      if (rows.length > TABLE_PAGE_SIZE) {
        wrap.style.display = 'block';
        btn.textContent = expanded ? 'Show less' : `View more (${rows.length - TABLE_PAGE_SIZE} more)`;
      } else wrap.style.display = 'none';
    }
  }
  function setSummaryBar(elId, html, variant) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!html) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden', 'info', 'danger', 'purple');
    if (variant) el.classList.add(variant);
    el.innerHTML = html;
  }

  function populateEquipmentTable() {
    const list = getFilteredEquipment();
    const rows = list.map(e => {
      const id = String(e.id || '').replace(/'/g, "\\'");
      return `<tr class="row-clickable" onclick="openEquipmentRowActions('${id}')" title="Click for actions / profile">
        <td>${e.shaft || '—'}</td><td>${e.level || '-'}</td><td>${inferEquipmentType(e)}</td>
        <td>${e.locoSize || '-'}</td><td><strong>${e.id}</strong></td><td>${e.section || '-'}</td><td>${e.oem || e.OEM || '—'}</td>
        <td style="color:var(--text-3);font-size:0.85rem;"><i class="fas fa-ellipsis-h"></i> Actions</td></tr>`;
    });
    renderPagedTable('equipment', rows);
    if (list.length > 10) setSummaryBar('equipment-summary-bar', `<div><strong>Equipment Register:</strong> ${list.length} units · Click a row for actions</div><div class="bar-actions"><button type="button" class="btn-view-more" onclick="toggleTableExpand('equipment')">View more</button></div>`, 'info');
    else setSummaryBar('equipment-summary-bar', list.length ? `<div><strong>Equipment Register:</strong> ${list.length} units · Click a row for actions</div>` : '');
  }

  function openEquipmentRowActions(id) {
    const escId = String(id).replace(/'/g, "\\'");
    let html = `<button type="button" class="btn btn-primary" style="width:100%;" onclick="closeModal('row-actions-modal');showEquipmentDetail('${escId}');"><i class="fas fa-id-card"></i> View Profile / Detail</button>`;
    if (can('edit_equipment')) {
      html += `<button type="button" class="btn btn-primary" style="width:100%;" onclick="closeModal('row-actions-modal');openEditEquipment('${escId}');"><i class="fas fa-edit"></i> Edit</button>`;
    }
    if (can('delete_equipment')) {
      html += `<button type="button" class="btn btn-danger" style="width:100%;" onclick="closeModal('row-actions-modal');removeEquipment('${escId}');"><i class="fas fa-trash"></i> Delete</button>`;
    }
    showRowActions('Equipment: ' + id, html);
  }
  window.openEquipmentRowActions = openEquipmentRowActions;

  function populateMaintTable() {
    const list = getFilteredMaintenance();
    let overdue = 0, dueSoon = 0, pattern = 0;
    const rows = list.map(m => {
      const days = m.dueDate ? Math.ceil((new Date(m.dueDate) - new Date()) / 86400000) : calculateDaysLeft(m.lastDone, m.interval);
      if (!isNaN(days)) { if (days < 0) overdue++; else if (days <= 7) dueSoon++; }
      if (m.source === 'failure-pattern') pattern++;
      const disp = isNaN(days) ? '-' : (days >= 0 ? days : Math.abs(days) + ' overdue');
      const source = m.source === 'failure-pattern' ? 'Predictive' : 'Manual';
      const escEq = String(m.equipment || '').replace(/'/g, "\\'");
      const escId = String(m.id || '').replace(/'/g, "\\'");
      return `<tr class="row-clickable" onclick="openMaintRowActions('${escEq}','${escId}')" title="Click for actions">
        <td>${m.equipment}</td><td>${m.task}</td><td>${m.interval || '-'}</td><td>${m.lastDone || '-'}</td>
        <td>${m.dueDate || calculateNextDue(m.lastDone, m.interval) || '-'}</td><td>${disp}</td><td>${source}</td>
        <td style="color:var(--text-3);font-size:0.85rem;"><i class="fas fa-ellipsis-h"></i> Actions</td></tr>`;
    });
    if (!rows.length) {
      document.querySelector('#maint-table tbody').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:16px;">No tasks</td></tr>';
      setSummaryBar('maint-summary-bar', '');
      return;
    }
    renderPagedTable('maint', rows);
    if (list.length > 10 || overdue || dueSoon || pattern) {
      setSummaryBar('maint-summary-bar', `<div><strong>Alerts:</strong> ${overdue} Overdue | ${dueSoon} Due Soon | ${pattern} Predictive · Click a row for actions</div>
        <div class="bar-actions"><button type="button" class="btn-view-more" onclick="toggleTableExpand('maint')">View more</button></div>`);
    } else setSummaryBar('maint-summary-bar', `<div>Click a row for actions</div>`);
  }

  function openMaintRowActions(equipId, maintId) {
    const escEq = String(equipId).replace(/'/g, "\\'");
    const escId = String(maintId || '').replace(/'/g, "\\'");
    showRowActions('Maintenance: ' + equipId, `
      <button type="button" class="btn btn-success" style="width:100%;" onclick="closeModal('row-actions-modal');markEquipmentFixed('${escEq}','${escId}');"><i class="fas fa-check"></i> Mark Fixed</button>
      <button type="button" class="btn btn-primary" style="width:100%;" onclick="closeModal('row-actions-modal');showEquipmentDetail('${escEq}');"><i class="fas fa-id-card"></i> Equipment Profile</button>
      ${escId ? `<button type="button" class="btn btn-primary" style="width:100%;" onclick="closeModal('row-actions-modal');dismissAlert('maint-${escId}');">Dismiss Alert</button>` : ''}
    `);
  }
  window.openMaintRowActions = openMaintRowActions;

  function populateOperationsReport() {
    const filteredEq = getFilteredEquipment();
    const filteredUp = getFilteredUpdates();
    const idSet = new Set(filteredEq.map(e => String(e.id)));
    filteredUp.forEach(u => { if (u.equipmentId) idSet.add(String(u.equipmentId)); });
    const allIds = [...idSet].filter(Boolean).sort();
    const statusSummary = { Up: 0, Down: 0 };
    const problemRows = [], highRiskRows = [];

    allIds.forEach(id => {
      const st = getEquipmentStatus(id);
      statusSummary[st.status] = (statusSummary[st.status] || 0) + 1;
      const eu = filteredUp.filter(u => String(u.equipmentId || '') === id);
      const totalDownHrs = eu.reduce((s, u) => s + (Number(u.downtimeHours || 0) || 0), 0);
      const fails = st.failures;
      const lastDown = eu.find(u => String(u.status || '').toLowerCase() === 'down');
      const lastReason = lastDown ? (lastDown.reason || '') : (eu[0]?.reason || '-');

      // Problem list still shows historical downtime / failures, but Status column now uses the improved rule
      if (st.status === 'Down' || totalDownHrs > 0 || fails > 0) {
        problemRows.push([id, st.status, st.color, lastReason, totalDownHrs.toFixed(1)]);
      }
      if (fails >= 2 || parseFloat(st.availability) < 90 || totalDownHrs > 48) {
        let mttfVal = 'N/A';
        if (fails >= 1) {
          const dates = eu.map(u => u.date).filter(Boolean).sort();
          if (dates.length >= 2) {
            const hours = Math.max(24, (new Date(dates[dates.length - 1]) - new Date(dates[0])) / 3600000 + 24);
            const downH = eu.reduce((s, u) => s + (Number(u.downtimeHours || 0) || 0), 0);
            mttfVal = (Math.max(1, hours - downH) / fails).toFixed(1);
          }
        }
        highRiskRows.push([id, fails, mttfVal, st.availability]);
      }
    });
    problemRows.sort((a, b) => parseFloat(b[4]) - parseFloat(a[4]));
    highRiskRows.sort((a, b) => b[1] - a[1]);

    const total = allIds.length || 1;
    const opBody = document.getElementById('op-status-tbody');
    if (opBody) {
      opBody.innerHTML = [
        ['Up (Operational)', statusSummary.Up || 0, (((statusSummary.Up || 0) / total) * 100).toFixed(2) + '%'],
        ['Down', statusSummary.Down || 0, (((statusSummary.Down || 0) / total) * 100).toFixed(2) + '%'],
        ['Total', allIds.length, '100.00%']
      ].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    }

    const problemHtml = problemRows.length
      ? problemRows.map(r => {
          const escId = String(r[0]).replace(/'/g, "\\'");
          return `<tr class="row-clickable" onclick="showProblemEquipmentDetail('${escId}')" title="Click for detail">
            <td><strong>${String(r[0]).replace(/</g,'&lt;')}</strong></td><td>${r[1]}</td>
            <td style="font-weight:700;color:${r[2]==='RED'?'#dc2626':r[2]==='ORANGE'?'#ea580c':'#16a34a'}">${r[2]}</td>
            <td style="max-width:280px;white-space:normal;">${(r[3]||'-').replace(/</g,'&lt;')}</td><td>${r[4]}</td></tr>`;
        })
      : ['<tr><td colspan="5" style="text-align:center;padding:20px;">No problem equipment.</td></tr>'];
    if (problemRows.length) {
      renderPagedTable('problem', problemHtml);
      setSummaryBar('ops-problem-summary', problemRows.length > 10 ? `<div><strong>Problem equipment:</strong> ${problemRows.length} · Click a row for detail</div><div class="bar-actions"><button type="button" class="btn-view-more" onclick="toggleTableExpand('problem')">View more</button></div>` : `<div><strong>Problem equipment:</strong> ${problemRows.length} · Click a row for detail</div>`, 'danger');
    } else {
      document.getElementById('problem-equipment-tbody').innerHTML = problemHtml[0];
      setSummaryBar('ops-problem-summary', '');
    }

    const highHtml = highRiskRows.length
      ? highRiskRows.map(r => {
          const escId = String(r[0]).replace(/'/g, "\\'");
          return `<tr class="row-clickable" onclick="showHighRiskDetail('${escId}')" title="Click for detail">
            <td><strong>${String(r[0]).replace(/</g,'&lt;')}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}%</td></tr>`;
        })
      : ['<tr><td colspan="4" style="text-align:center;padding:20px;">No high-risk equipment.</td></tr>'];
    if (highRiskRows.length) {
      renderPagedTable('highrisk', highHtml);
      setSummaryBar('ops-highrisk-summary', highRiskRows.length > 10 ? `<div><strong>High-risk:</strong> ${highRiskRows.length} · Click a row for detail</div><div class="bar-actions"><button type="button" class="btn-view-more" onclick="toggleTableExpand('highrisk')">View more</button></div>` : `<div><strong>High-risk:</strong> ${highRiskRows.length} · Click a row for detail</div>`, 'purple');
    } else {
      document.getElementById('high-risk-tbody').innerHTML = highHtml[0];
      setSummaryBar('ops-highrisk-summary', '');
    }
  }

  // ── Calendar ─────────────────────────────────────────────────
  function getMaintenanceEvents() {
    const events = [];
    const maintSource = getFilteredMaintenance();
    const patternMap = {};
    try { analyseFailurePatterns().forEach(p => { patternMap[String(p.equipment)] = p; }); } catch (e) {}
    const calSeen = new Set();
    maintSource.forEach(task => {
      if (isAlertDismissed('maint-' + task.id)) return;
      const equipKey = String(task.equipment || '').toLowerCase();
      if (task.source === 'failure-pattern') {
        if (!equipKey || calSeen.has('p|' + equipKey)) return;
        calSeen.add('p|' + equipKey);
      }
      let due = task.dueDate || calculateNextDue(task.lastDone, task.interval);
      if (!due) return;
      const days = task.dueDate ? Math.ceil((new Date(task.dueDate) - new Date()) / 86400000) : calculateDaysLeft(task.lastDone, task.interval);
      let color = '#16a34a';
      if (days < 0) color = '#dc2626'; else if (days <= 7) color = '#ea580c';
      if (task.source === 'failure-pattern') color = '#7c3aed';
      const pInfo = patternMap[String(task.equipment)] || {};
      events.push({
        title: `${task.equipment} - ${(task.task || 'Maintenance').slice(0, 48)}`,
        start: due, allDay: true, backgroundColor: color, borderColor: color,
        extendedProps: {
          daysLeft: days, source: task.source || 'manual', equipment: task.equipment, maintId: task.id || '',
          task: task.task || '', dueDate: due, focus: pInfo.focus || '', actions: pInfo.actions || '',
          topMode: pInfo.topMode || '', priority: pInfo.priority || '', priorityColor: pInfo.priorityColor || color,
          lastReason: pInfo.lastReason || '', failures: pInfo.failures || '', avgDays: pInfo.avgDaysBetween || '',
          lastDone: task.lastDone || ''
        }
      });
    });
    analyseFailurePatterns().forEach(p => {
      if (isAlertDismissed('fail-' + p.equipment)) return;
      if (events.some(e => String(e.extendedProps.equipment) === String(p.equipment) && e.extendedProps.source === 'failure-pattern')) return;
      let color = '#7c3aed';
      if (p.daysUntil < 0) color = '#dc2626'; else if (p.daysUntil <= 7) color = '#ea580c';
      events.push({
        title: `${p.equipment} - Predictive inspection`,
        start: p.predictedNext, allDay: true, backgroundColor: color, borderColor: color,
        extendedProps: {
          daysLeft: p.daysUntil, source: 'failure-pattern', equipment: p.equipment, maintId: '',
          task: p.task, dueDate: p.predictedNext, focus: p.focus, actions: p.actions,
          topMode: p.topMode, priority: p.priority, priorityColor: p.priorityColor,
          lastReason: p.lastReason, failures: p.failures, avgDays: p.avgDaysBetween, lastDone: p.lastBreakdown
        }
      });
    });
    return events;
  }

  function openInspectionTaskFromEvent(ev) {
    const x = ev?.extendedProps || {};
    const equipment = x.equipment || (ev.title || '').split(' - ')[0] || '—';
    const days = x.daysLeft;
    const dueLabel = isNaN(days) ? '—' : (days >= 0 ? `${days} day(s) remaining` : `${Math.abs(days)} day(s) overdue`);
    const body = document.getElementById('inspection-task-body');
    if (!body) return;
    const checklist = (x.actions || 'Full walk-around and known fault points.').split(/;|·|\n/).map(s => s.trim()).filter(Boolean);
    body.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-bottom:0.85rem;">
        <span style="font-size:1.25rem;font-weight:800;">${String(equipment).replace(/</g,'&lt;')}</span>
        ${x.priority ? `<span style="padding:0.25rem 0.7rem;border-radius:999px;font-size:0.78rem;font-weight:700;background:${x.priorityColor||'#7c3aed'};color:#fff;">${x.priority}</span>` : ''}
        <span style="font-size:0.85rem;color:var(--text-3);">${x.source === 'failure-pattern' ? 'Predictive (does not mark unit Down)' : 'Scheduled'}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:1rem;">
        <div><div style="font-size:0.75rem;color:var(--text-3);font-weight:600;">DUE</div><div style="font-weight:700;">${x.dueDate || '—'}</div></div>
        <div><div style="font-size:0.75rem;color:var(--text-3);font-weight:600;">STATUS</div><div style="font-weight:700;color:${days < 0 ? 'var(--danger)' : 'var(--text)'};">${dueLabel}</div></div>
        <div><div style="font-size:0.75rem;color:var(--text-3);font-weight:600;">FAILURES / AVG</div><div style="font-weight:700;">${x.failures || '—'} · every ${x.avgDays || '—'} days</div></div>
      </div>
      <div style="padding:0.85rem 1rem;border-radius:10px;background:var(--surface-2);border-left:4px solid var(--primary);margin-bottom:0.85rem;">
        <div style="font-size:0.78rem;font-weight:700;color:var(--primary);">AREA OF FOCUS</div>
        <div style="font-size:1.05rem;font-weight:700;margin-top:0.25rem;">${x.focus || x.topMode || 'General inspection'}</div>
      </div>
      <ol style="margin:0;padding-left:1.25rem;line-height:1.55;">
        ${checklist.map(s => `<li>${String(s).replace(/</g,'&lt;')}</li>`).join('') || '<li>Full inspection</li>'}
        <li>Update status only when actual work is performed</li>
      </ol>
      ${x.lastReason ? `<div style="font-size:0.88rem;color:var(--text-3);margin-top:0.75rem;font-style:italic;"><strong>Last fault:</strong> ${String(x.lastReason).replace(/</g,'&lt;')}</div>` : ''}
    `;
    const fixBtn = document.getElementById('inspection-mark-fixed');
    if (fixBtn) fixBtn.onclick = () => { markEquipmentFixed(equipment, x.maintId || ''); closeModal('inspection-task-modal'); };
    openModal('inspection-task-modal');
  }
  window.openInspectionTaskFromEvent = openInspectionTaskFromEvent;

  function initCalendar() {
    const el = document.getElementById('calendar-div');
    if (!el) return;
    if (calendar) calendar.destroy();
    const isMobile = window.innerWidth <= 768;
    calendar = new FullCalendar.Calendar(el, {
      initialView: isMobile ? 'listWeek' : 'dayGridMonth',
      headerToolbar: { left: 'prev,next today', center: 'title', right: isMobile ? 'listWeek' : 'dayGridMonth,listWeek' },
      height: 'auto',
      events: getMaintenanceEvents(),
      eventContent: arg => {
        const x = arg.event.extendedProps || {};
        return { html: `<div style="padding:4px;cursor:pointer;">${arg.event.title}<br><small>Days left: ${x.daysLeft}</small>${x.focus ? `<br><small>Focus: ${x.focus}</small>` : ''}</div>` };
      },
      eventClick: info => { info.jsEvent.preventDefault(); openInspectionTaskFromEvent(info.event); }
    });
    calendar.render();
  }

  // ── Text Mining ─────────────────────────────────────────────
  function tmClassifyReason(text) {
    const t = String(text || '').toLowerCase();
    if (!t.trim()) return { mode: 'No text', color: '#94a3b8' };
    if (/derail/.test(t)) return { mode: 'Derailment', color: '#7c3aed' };
    if (/brake|binding/.test(t)) return { mode: 'Brakes / Binding', color: '#dc2626' };
    if (/battery|cell|charger/.test(t)) return { mode: 'Battery / Cells', color: '#16a34a' };
    if (/antenna|gabooz|pulse|network|canbus|rf\b/.test(t)) return { mode: 'Antenna / Comms / Display', color: '#1d4ed8' };
    if (/light|siren|speedo|screen|display/.test(t)) return { mode: 'Lights / Siren / Speedo / Display', color: '#0891b2' };
    if (/motor|gear|power|control|movement|tram|hydraulic/.test(t)) return { mode: 'Motor / Power / Control / Movement', color: '#ea580c' };
    if (/door|magnet|buffer/.test(t)) return { mode: 'Door / Magnet / Buffer', color: '#ca8a04' };
    return { mode: 'Other / Unclassified', color: '#64748b' };
  }
  function tmGetReason(u) { return String(u.reason || u.fault || u.description || '').trim(); }
  function tmGetEquipId(u) { return String(u.equipmentId || u.locoNumber || 'Unknown'); }
  function tmGetDowntime(u) { return Number(u.downtimeHours || u.downtime || 0) || 0; }

  function tmAnalyseLiveData() {
    const rows = getFilteredUpdates().filter(u => tmGetReason(u).length > 0);
    const modeCounts = {}, locoStats = {}, levelCounts = {}, modeByLocoDates = {};
    rows.forEach(u => {
      const id = tmGetEquipId(u);
      const reason = tmGetReason(u);
      const { mode } = tmClassifyReason(reason);
      const down = tmGetDowntime(u);
      const eq = (equipment || []).find(e => String(e.id) === id);
      const level = eq?.level || eq?.workPlace || 'Unknown';
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
      levelCounts[level] = (levelCounts[level] || 0) + 1;
      if (!locoStats[id]) locoStats[id] = { count: 0, down: 0, modes: {}, lastReason: '' };
      locoStats[id].count++; locoStats[id].down += down;
      locoStats[id].modes[mode] = (locoStats[id].modes[mode] || 0) + 1;
      locoStats[id].lastReason = reason;
      const mk = id + '||' + mode;
      if (!modeByLocoDates[mk]) modeByLocoDates[mk] = new Set();
      if (u.date) modeByLocoDates[mk].add(String(u.date));
    });
    let topMode = '—', topModeCount = 0;
    Object.entries(modeCounts).forEach(([m, c]) => { if (c > topModeCount) { topMode = m; topModeCount = c; } });
    const badList = Object.entries(locoStats).map(([id, s]) => {
      let topM = '—', topC = 0;
      Object.entries(s.modes).forEach(([m, c]) => { if (c > topC) { topM = m; topC = c; } });
      return { id, count: s.count, down: s.down, topMode: topM, lastReason: s.lastReason };
    }).sort((a, b) => b.count - a.count);
    const recurrence = [];
    Object.entries(modeByLocoDates).forEach(([key, dateSet]) => {
      if (dateSet.size >= 2) {
        const [id, mode] = key.split('||');
        recurrence.push({ id, mode, times: locoStats[id]?.modes[mode] || dateSet.size, dates: dateSet.size });
      }
    });
    recurrence.sort((a, b) => b.times - a.times);
    return {
      total: rows.length, topMode, topModeCount,
      multiFault: badList.filter(x => x.count >= 2).length,
      totalDown: rows.reduce((s, u) => s + tmGetDowntime(u), 0),
      modeCounts, levelCounts, badList, recurrence
    };
  }

  function refreshTextMiningInsights() {
    const emptyEl = document.getElementById('tm-empty');
    const contentEl = document.getElementById('tm-content');
    if (!contentEl) return;
    const analysis = tmAnalyseLiveData();
    if (analysis.total === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      contentEl.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    contentEl.style.display = 'block';
    document.getElementById('tm-kpi-records').textContent = analysis.total.toLocaleString();
    document.getElementById('tm-kpi-top-mode').textContent = analysis.topMode.length > 18 ? analysis.topMode.slice(0, 16) + '…' : analysis.topMode;
    document.getElementById('tm-kpi-bad').textContent = analysis.multiFault;
    document.getElementById('tm-kpi-down').textContent = (Math.round(analysis.totalDown * 10) / 10).toLocaleString();

    const alerts = document.getElementById('tm-alerts');
    let html = '';
    if (analysis.topModeCount > 0) {
      const pct = ((analysis.topModeCount / analysis.total) * 100).toFixed(1);
      html += `<div class="alert-banner alert-predictive"><strong>Dominant mode:</strong> ${analysis.topMode} (${analysis.topModeCount} · ${pct}%)</div>`;
    }
    if (analysis.recurrence[0]) {
      const t = analysis.recurrence[0];
      html += `<div class="alert-banner alert-high-risk"><strong>Recurrence:</strong> ${t.id} shows ${t.mode} on ${t.dates} dates</div>`;
    }
    if (alerts) alerts.innerHTML = html;

    window._lastBadActors = analysis.badList || [];
    const badRows = (analysis.badList || []).map((r, i) => {
      const escId = String(r.id || '').replace(/'/g, "\\'");
      return `<tr class="row-clickable" onclick="showBadActorDetail('${escId}')" title="Click for detail">
        <td>${i+1}</td><td><strong>${String(r.id).replace(/</g,'&lt;')}</strong></td><td>${r.count}</td><td>${Math.round(r.down*10)/10}</td><td>${r.topMode}</td>
        <td style="max-width:280px;white-space:normal;">${(r.lastReason||'').replace(/</g,'&lt;')}</td></tr>`;
    });
    if (badRows.length) {
      renderPagedTable('tm-bad', badRows);
      setSummaryBar('tm-bad-summary', badRows.length > 10 ? `<div><strong>Bad actors:</strong> ${badRows.length} · Click a row for detail</div><div class="bar-actions"><button type="button" class="btn-view-more" onclick="toggleTableExpand('tm-bad')">View more</button></div>` : `<div><strong>Bad actors:</strong> ${badRows.length} · Click a row for detail</div>`, 'purple');
    } else {
      document.getElementById('tm-bad-tbody').innerHTML = '<tr><td colspan="6">None yet</td></tr>';
      setSummaryBar('tm-bad-summary', '');
    }

    window._lastRecurrence = analysis.recurrence || [];
    const recurBody = document.getElementById('tm-recur-tbody');
    const recurEmpty = document.getElementById('tm-recur-empty');
    if (!analysis.recurrence.length) {
      if (recurBody) recurBody.innerHTML = '';
      if (recurEmpty) recurEmpty.style.display = 'block';
      setSummaryBar('tm-recur-summary', '');
    } else {
      if (recurEmpty) recurEmpty.style.display = 'none';
      const rows = analysis.recurrence.map(r => `<tr><td><strong>${r.id}</strong></td><td>${r.mode}</td><td>${r.times}</td><td>${r.dates}</td><td style="color:var(--danger);font-weight:600;">Escalate</td></tr>`);
      renderPagedTable('tm-recur', rows);
      setSummaryBar('tm-recur-summary', rows.length > 10 ? `<div><strong>Recurrence:</strong> ${rows.length}</div><div class="bar-actions"><button type="button" class="btn-view-more" onclick="toggleTableExpand('tm-recur')">View more</button></div>` : '', 'purple');
    }

    if (window.Chart) {
      const modeLabels = Object.keys(analysis.modeCounts);
      const modeData = Object.values(analysis.modeCounts);
      const colorMap = { 'Derailment':'#7c3aed','Brakes / Binding':'#dc2626','Battery / Cells':'#16a34a','Antenna / Comms / Display':'#1d4ed8','Lights / Siren / Speedo / Display':'#0891b2','Motor / Power / Control / Movement':'#ea580c','Door / Magnet / Buffer':'#ca8a04','Other / Unclassified':'#64748b' };
      if (window._tmModeChart) window._tmModeChart.destroy();
      if (window._tmLevelChart) window._tmLevelChart.destroy();
      const modeCanvas = document.getElementById('tm-mode-chart');
      const levelCanvas = document.getElementById('tm-level-chart');
      if (modeCanvas) {
        window._tmModeChart = new Chart(modeCanvas, {
          type: 'doughnut',
          data: { labels: modeLabels.length ? modeLabels : ['No data'], datasets: [{ data: modeData.length ? modeData : [1], backgroundColor: modeLabels.map(m => colorMap[m] || '#64748b'), borderWidth: 2, borderColor: '#fff' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }
        });
      }
      if (levelCanvas) {
        const levelLabels = Object.keys(analysis.levelCounts).sort((a, b) => analysis.levelCounts[b] - analysis.levelCounts[a]);
        window._tmLevelChart = new Chart(levelCanvas, {
          type: 'bar',
          data: { labels: levelLabels.length ? levelLabels : ['No data'], datasets: [{ data: levelLabels.map(l => analysis.levelCounts[l]), backgroundColor: '#1d4ed8', borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
      }
    }
  }
  window.refreshTextMiningInsights = refreshTextMiningInsights;

  function tmTestClassify() {
    const input = document.getElementById('tm-classify-input');
    const result = document.getElementById('tm-classify-result');
    if (!input || !result) return;
    const { mode, color } = tmClassifyReason(input.value);
    result.style.display = 'block';
    result.innerHTML = `<strong style="color:${color};">${mode}</strong>`;
  }
  window.tmTestClassify = tmTestClassify;

  // ── Professional PDF / Excel ─────────────────────────────────
  function createExecutivePDF(title, subtitle) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RBE MONITOR', 14, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Rustenburg Based Operations – Executive Report', 14, 16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, 14, 32);
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(subtitle, 14, 39);
    }
    const addFooter = (pageNum) => {
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated ${new Date().toLocaleString('en-ZA')}  |  Confidential – RBE Executive`, 14, pageHeight - 7);
      doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
    };
    return { doc, pageWidth, pageHeight, addFooter, startY: subtitle ? 45 : 38 };
  }

  window.exportDashboardPDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Executive Dashboard Summary', getActiveFilterLabel() || 'All Shafts · All Types');
    const ids = new Set(getFilteredEquipment().map(e => String(e.id)));
    getFilteredUpdates().forEach(u => { if (u.equipmentId) ids.add(String(u.equipmentId)); });
    let up = 0, down = 0, totalAvail = 0;
    [...ids].forEach(id => {
      const st = getEquipmentStatus(id);
      if (st.status === 'Up') up++; else down++;
      totalAvail += parseFloat(st.availability) || 0;
    });
    const avgAvail = ids.size ? (totalAvail / ids.size).toFixed(1) : '100.0';
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', 14, startY);
    doc.autoTable({
      startY: startY + 4,
      head: [['Metric', 'Value']],
      body: [
        ['Total Equipment', String(ids.size)],
        ['Operational (Up)', String(up)],
        ['Down', String(down)],
        ['Fleet Availability', avgAvail + '%'],
        ['Operational %', ids.size ? ((up / ids.size) * 100).toFixed(1) + '%' : '100%']
      ],
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 14, right: 14 }
    });
    addFooter(1);
    doc.save('RBE_Executive_Dashboard.pdf');
  };

  window.exportEquipmentPDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Equipment Register', getActiveFilterLabel() || 'Full Fleet');
    const data = getFilteredEquipment().map(e => [e.shaft || '-', e.level || '-', inferEquipmentType(e), e.locoSize || '-', e.id, e.section || '-', e.oem || e.OEM || '-']);
    doc.autoTable({ startY, head: [['Shaft', 'Level', 'Type', 'Size', 'ID', 'SECTION', 'OEM']], body: data,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] }, margin: { left: 14, right: 14 } });
    addFooter(1); doc.save('RBE_Equipment_Register.pdf');
  };

  window.exportMaintPDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Maintenance Schedule', getActiveFilterLabel() || 'Full Fleet');
    const data = getFilteredMaintenance().map(m => {
      const days = m.dueDate ? Math.ceil((new Date(m.dueDate) - new Date()) / 86400000) : calculateDaysLeft(m.lastDone, m.interval);
      return [m.equipment, m.task, m.interval, m.lastDone, m.dueDate || calculateNextDue(m.lastDone, m.interval) || '-', isNaN(days) ? '-' : days, m.source === 'failure-pattern' ? 'Predictive' : 'Manual'];
    });
    doc.autoTable({ startY, head: [['Equipment', 'Task', 'Interval', 'Last Done', 'Due', 'Days Left', 'Source']], body: data,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] }, margin: { left: 14, right: 14 } });
    addFooter(1); doc.save('RBE_Maintenance_Schedule.pdf');
  };

  window.exportOperationsReportPDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Operations Report', getActiveFilterLabel() || 'Full Fleet');
    populateOperationsReport();
    const statusBody = [];
    document.querySelectorAll('#op-status-tbody tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
      if (cells.length >= 3) statusBody.push(cells);
    });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Operation Status', 14, startY);
    doc.autoTable({ startY: startY + 4, head: [['Status', 'Count', 'Percentage']], body: statusBody,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
    addFooter(1); doc.save('RBE_Operations_Report.pdf');
  };

  window.exportAlertsPDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Dashboard Alerts', getActiveFilterLabel() || 'Full Fleet');
    const rows = [];
    ['high-risk-list', 'predictive-list', 'failure-pattern-list'].forEach(id => {
      const ul = document.getElementById(id);
      if (!ul) return;
      ul.querySelectorAll('li').forEach(li => rows.push([id.replace('-list', ''), li.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)]));
    });
    doc.autoTable({ startY, head: [['Category', 'Detail']], body: rows,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
    addFooter(1); doc.save('RBE_Dashboard_Alerts.pdf');
  };

  window.exportBadActorsPDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Bad Actors', getActiveFilterLabel() || 'Full Fleet');
    const data = (window._lastBadActors || []).map((r, i) => [String(i+1), r.id, String(r.count), String(Math.round(r.down*10)/10), r.topMode, (r.lastReason||'').slice(0,50)]);
    doc.autoTable({ startY, head: [['#', 'ID', 'Faults', 'Down hrs', 'Top mode', 'Last fault']], body: data,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
    addFooter(1); doc.save('RBE_Bad_Actors.pdf');
  };

  window.exportRecurrencePDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Recurrence Warnings', getActiveFilterLabel() || 'Full Fleet');
    const rows = (window._lastRecurrence || []).map(r => [r.id, r.mode, String(r.times), String(r.dates), 'Escalate']);
    doc.autoTable({ startY, head: [['Equipment', 'Mode', 'Times', 'Dates', 'Suggestion']], body: rows,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
    addFooter(1); doc.save('RBE_Recurrence_Warnings.pdf');
  };

  window.exportUpcomingMaintPDF = function() {
    const { doc, addFooter, startY } = createExecutivePDF('Upcoming & Overdue Maintenance', getActiveFilterLabel() || 'Full Fleet');
    const items = window._lastUpcomingMaint || [];
    doc.autoTable({ startY, head: [['Equipment', 'Task', 'Days Left', 'Source']], body: items.map(m => [m.equipment, m.task, String(m.days), m.source === 'failure-pattern' ? 'Predictive' : 'Manual']),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [8, 145, 178], textColor: 255, fontStyle: 'bold' }, margin: { left: 14, right: 14 } });
    addFooter(1); doc.save('RBE_Upcoming_Maintenance.pdf');
  };

  function downloadXLSX(filename, sheets) {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, headers, rows }) => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  }

  window.exportEquipmentExcel = () => downloadXLSX('RBE_Equipment_Register.xlsx', [{ name: 'Equipment', headers: ['Operation','Work Place','Type','Size','ID','SECTION','OEM'], rows: getFilteredEquipment().map(e => [e.shaft||'', e.level||'', inferEquipmentType(e), e.locoSize||'', e.id||'', e.section||'', e.oem||e.OEM||'']) }]);
  window.exportMaintExcel = () => downloadXLSX('RBE_Maintenance_Schedule.xlsx', [{ name: 'Maintenance', headers: ['Equipment','Task','Interval','Last Done','Due','Days Left','Source'], rows: getFilteredMaintenance().map(m => {
    const days = m.dueDate ? Math.ceil((new Date(m.dueDate) - new Date()) / 86400000) : calculateDaysLeft(m.lastDone, m.interval);
    return [m.equipment, m.task, m.interval, m.lastDone, m.dueDate||'', days, m.source === 'failure-pattern' ? 'Predictive' : 'Manual'];
  }) }]);
  window.exportOperationsExcel = () => {
    const problem = [], high = [];
    const ids = new Set(getFilteredEquipment().map(e => String(e.id)));
    getFilteredUpdates().forEach(u => { if (u.equipmentId) ids.add(String(u.equipmentId)); });
    [...ids].forEach(id => {
      const st = getEquipmentStatus(id);
      if (st.status === 'Down' || st.downtime > 0 || st.failures > 0) problem.push([id, st.status, st.color, st.lastReason||'', st.downtime.toFixed(1)]);
      if (st.failures >= 2 || parseFloat(st.availability) < 90 || st.downtime > 48) high.push([id, st.failures, '', st.availability]);
    });
    downloadXLSX('RBE_Operations_Report.xlsx', [
      { name: 'Problem', headers: ['ID','Status','Color','Last Reason','Downtime'], rows: problem },
      { name: 'High Risk', headers: ['ID','Failures','MTTF','Availability'], rows: high }
    ]);
  };
  window.exportBadActorsExcel = () => downloadXLSX('RBE_Bad_Actors.xlsx', [{ name: 'Bad Actors', headers: ['#','ID','Faults','Down hrs','Top mode','Last fault'], rows: (window._lastBadActors||[]).map((r,i) => [i+1, r.id, r.count, r.down, r.topMode, r.lastReason]) }]);
  window.exportRecurrenceExcel = () => downloadXLSX('RBE_Recurrence_Warnings.xlsx', [{ name: 'Recurrence', headers: ['ID','Mode','Times','Dates','Suggestion'], rows: (window._lastRecurrence||[]).map(r => [r.id, r.mode, r.times, r.dates, 'Escalate']) }]);
  window.exportUpcomingMaintExcel = () => downloadXLSX('RBE_Upcoming_Maintenance.xlsx', [{ name: 'Upcoming', headers: ['Equipment','Task','Days Left','Source'], rows: (window._lastUpcomingMaint||[]).map(m => [m.equipment, m.task, m.days, m.source === 'failure-pattern' ? 'Predictive' : 'Manual']) }]);
  window.exportAlertsCSV = function() {
    const lines = [];
    ['high-risk-list','predictive-list','failure-pattern-list'].forEach(id => {
      const ul = document.getElementById(id);
      if (!ul) return;
      ul.querySelectorAll('li').forEach(li => lines.push([id, li.innerText.replace(/\s+/g,' ').trim()]));
    });
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    const csv = 'Category,Detail\n' + lines.map(r => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'RBE_Dashboard_Alerts.csv';
    a.click();
  };

  // ── Quick find / CRUD ────────────────────────────────────────
  function quickFindInTable(tableId, q) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const needle = String(q || '').trim().toLowerCase();
    table.querySelectorAll('tbody tr').forEach(tr => {
      const text = tr.innerText.toLowerCase();
      if (!needle) { tr.classList.remove('qf-highlight', 'qf-dim'); return; }
      if (text.includes(needle)) { tr.classList.add('qf-highlight'); tr.classList.remove('qf-dim'); tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      else { tr.classList.add('qf-dim'); tr.classList.remove('qf-highlight'); }
    });
  }
  window.quickFindInTable = quickFindInTable;
  function clearQuickFind(tableId, inputId) {
    const table = document.getElementById(tableId);
    if (table) table.querySelectorAll('tbody tr').forEach(tr => tr.classList.remove('qf-highlight', 'qf-dim'));
    const input = document.getElementById(inputId);
    if (input) input.value = '';
  }
  window.clearQuickFind = clearQuickFind;
  function quickFindOnCalendar(q) {
    if (!calendar || !q) return;
    const hit = calendar.getEvents().find(e => String(e.extendedProps.equipment || '').toLowerCase() === String(q).toLowerCase());
    const status = document.getElementById('calendar-find-status');
    if (hit) { calendar.gotoDate(hit.start); openInspectionTaskFromEvent(hit); if (status) { status.style.display = 'block'; status.textContent = `Found ${q}`; } }
    else if (status) { status.style.display = 'block'; status.textContent = `No event for ${q}`; }
  }
  window.quickFindOnCalendar = quickFindOnCalendar;
  function clearCalendarFind() {
    const input = document.getElementById('qf-calendar');
    if (input) input.value = '';
    const status = document.getElementById('calendar-find-status');
    if (status) status.style.display = 'none';
  }
  window.clearCalendarFind = clearCalendarFind;

  function removeEquipment(id) {
    if (!assertCan('delete_equipment', { equipmentId: id }, 'Only admins can delete equipment')) return;
    if (!confirm(`Delete equipment "${id}" and all related records?`)) return;
    (async () => {
      try {
        await deleteDoc(doc(db, "equipment", id));
        const usnap = await getDocs(query(collection(db, "status_updates"), where("equipmentId", "==", id)));
        for (const d of usnap.docs) await deleteDoc(d.ref);
        const msnap = await getDocs(query(collection(db, "maintenance"), where("equipment", "==", id)));
        for (const d of msnap.docs) await deleteDoc(d.ref);
        showToast('Equipment removed', 'success');
        refreshCurrentView();
      } catch (err) { showToast('Error: ' + err.message, 'error'); }
    })();
  }
  window.removeEquipment = removeEquipment;

  function openEditEquipment(id) {
    const eq = (equipment || []).find(e => String(e.id) === String(id));
    if (!eq) return alert('Not found');
    const shaftSel = document.getElementById('edit-eq-shaft');
    if (shaftSel) {
      const src = document.getElementById('shaft-filter');
      shaftSel.innerHTML = '<option value="">— Unassigned —</option>';
      if (src) [...src.options].forEach(o => { if (!o.value) return; const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.textContent; shaftSel.appendChild(opt); });
    }
    document.getElementById('edit-eq-original-id').value = id;
    document.getElementById('edit-eq-id').value = id;
    document.getElementById('edit-eq-shaft').value = eq.shaft || '';
    document.getElementById('edit-eq-level').value = eq.level || '';
    document.getElementById('edit-eq-size').value = eq.locoSize || '';
    document.getElementById('edit-eq-section').value = eq.section || '';
    document.getElementById('edit-eq-oem').value = eq.oem || eq.OEM || '';
    document.getElementById('edit-eq-type').value = inferEquipmentType(eq);
    openModal('edit-equipment-modal');
  }
  window.openEditEquipment = openEditEquipment;

  async function markEquipmentFixed(equipId, maintId) {
    if (!assertCan('mark_fixed', { equipmentId: equipId }, 'Not authorized to mark fixed for this equipment/shaft')) return;
    const actor = getActor();
    try {
      await addDoc(collection(db, "status_updates"), {
        equipmentId: equipId, date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5), status: 'Fixed', shift: 'Morning',
        reason: 'Marked fixed from inspection / maintenance', downtimeHours: 0, isFailure: '0',
        source: 'Mark Fixed', createdAt: serverTimestamp(),
        updatedBy: actor.name, updatedByEmail: actor.email, updatedByUid: actor.uid,
        updatedByCompanyNumber: actor.companyNumber || '',
        changedAt: new Date().toISOString()
      });
      if (maintId) try { await updateDoc(doc(db, "maintenance", maintId), { lastDone: new Date().toISOString().slice(0, 10) }); } catch (e) {}
      showToast('Marked Fixed', 'success');
      if (typeof logAudit === 'function') logAudit('mark_fixed', 'Equipment marked fixed from inspection/maintenance', equipId);
      refreshCurrentView();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  }
  window.markEquipmentFixed = markEquipmentFixed;

  // ── Forms ────────────────────────────────────────────────────
  document.getElementById('edit-equipment-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('edit-eq-original-id').value.trim();
    if (!id) return;
    try {
      await setDoc(doc(db, 'equipment', id), {
        shaft: document.getElementById('edit-eq-shaft').value || '',
        level: document.getElementById('edit-eq-level').value || '',
        equipmentType: document.getElementById('edit-eq-type').value || '',
        locoSize: document.getElementById('edit-eq-size').value || '',
        section: document.getElementById('edit-eq-section').value || '',
        oem: document.getElementById('edit-eq-oem').value.trim() || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      closeModal('edit-equipment-modal');
      alert('Updated'); populateEquipmentTable(); refreshCurrentView();
    } catch (err) { alert('Error: ' + err.message); }
  });

  document.getElementById('add-eq-form').addEventListener('submit', async e => {
    e.preventDefault();
    const shaftVal = document.getElementById('shaft').value;
    if (!assertCan('add_equipment', { shaft: shaftVal }, 'Not authorized to add equipment for this shaft')) return;
    const actor = getActor();
    const rawId = document.getElementById('loco-number').value.trim();
    const id = sanitizeEquipmentId(rawId);
    if (!id) return showToast('Valid Equipment ID required', 'error');
    try {
      const payload = {
        shaft: shaftVal,
        level: document.getElementById('level').value,
        equipmentType: document.getElementById('eq-type').value || '',
        oem: document.getElementById('eq-oem').value.trim() || '',
        locoSize: document.getElementById('loco-size').value,
        section: document.getElementById('section').value,
        updatedBy: actor.name,
        updatedByEmail: actor.email,
        updatedAt: new Date().toISOString()
      };
      if (rawId && rawId !== id) payload.originalId = rawId;
      await setDoc(doc(db, "equipment", id), payload, { merge: true });
      showToast(rawId !== id ? `Equipment saved as "${id}"` : 'Equipment saved', 'success');
      try { logAudit('equipment_create', 'Added equipment ' + id, id, { shaft: payload.shaft, source: 'ui' }); } catch (e) {}
      e.target.reset();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  });

  document.getElementById('add-status-form').addEventListener('submit', async e => {
    e.preventDefault();
    const equipId = document.getElementById('u-loco').value.trim();
    if (!assertCan('add_status', { equipmentId: equipId }, 'Not authorized to log status for this equipment/shaft')) return;
    const actor = getActor();
    const data = {
      equipmentId: equipId,
      date: document.getElementById('u-date').value,
      time: document.getElementById('u-time').value,
      status: document.getElementById('u-status').value,
      shift: document.getElementById('u-shift').value,
      reason: document.getElementById('u-reason').value.trim(),
      downtimeHours: Number(document.getElementById('u-downtime').value) || 0,
      isFailure: document.getElementById('u-failure').value,
      createdAt: serverTimestamp(),
      updatedBy: actor.name,
      updatedByEmail: actor.email,
      updatedByUid: actor.uid,
      updatedByCompanyNumber: actor.companyNumber || '',
      changedAt: new Date().toISOString()
    };
    if (!data.equipmentId || !data.date || !data.reason) return showToast('Required fields missing', 'error');
    try {
      await addDoc(collection(db, "status_updates"), data);
      showToast('Status update saved', 'success');
      if (typeof logAudit === 'function') logAudit('status_update', data.status + ': ' + (data.reason || '').slice(0, 80), data.equipmentId);
      e.target.reset();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  });

  document.getElementById('edit-maint-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('edit-index').value;
    try {
      await updateDoc(doc(db, "maintenance", id), {
        equipment: document.getElementById('edit-equipment').value,
        task: document.getElementById('edit-task').value,
        interval: document.getElementById('edit-interval').value,
        lastDone: document.getElementById('edit-last').value
      });
      closeModal('edit-modal');
      refreshCurrentView();
    } catch (err) { alert('Error: ' + err.message); }
  });

  document.getElementById('add-maint-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const data = {
      equipment: String(f[0].value || '').trim(),
      task: String(f[1].value || '').trim(),
      interval: f[2].value,
      lastDone: f[3].value,
      source: 'manual',
      createdAt: new Date().toISOString()
    };
    if (!data.equipment || !data.task || !data.lastDone) return alert('Required fields missing');
    try {
      await addDoc(collection(db, "maintenance"), data);
      alert('Added'); closeModal('add-maint-modal'); e.target.reset();
    } catch (err) { alert('Error: ' + err.message); }
  });

  // ── Search ───────────────────────────────────────────────────
  let historyUnsubscribe = null;
  function startSearchHistoryListener() {
    if (historyUnsubscribe) historyUnsubscribe();
    historyUnsubscribe = onSnapshot(query(collection(db, "searchHistory"), orderBy("timestamp", "desc"), limit(5)), snap => {
      const history = [];
      snap.forEach(d => {
        const data = d.data();
        history.push({ id: d.id, ...data, timestamp: data.timestamp ? data.timestamp.toDate() : new Date(data.searchedAt) });
      });
      const container = document.getElementById('history-list');
      if (!container) return;
      container.innerHTML = history.length ? history.map(item =>
        `<li style="padding:0.6rem 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;">
          <div><strong>${item.jobOrder}</strong><br><small style="color:var(--text-3);">${item.pdfName || ''}</small></div>
          <small style="color:var(--text-3);">${item.timestamp.toLocaleString()}</small>
        </li>`).join('') : '<li style="color:var(--text-3);">No searches yet.</li>';
    });
  }
  async function addToSearchHistory(label) {
    if (!label) return;
    try { await addDoc(collection(db, "searchHistory"), { jobOrder: label, pdfName: label, timestamp: serverTimestamp(), searchedAt: new Date().toISOString() }); } catch (e) {}
  }

  document.getElementById('search-form').addEventListener('submit', async e => {
    e.preventDefault();
    const equipmentId = document.getElementById('s-loco').value.trim();
    const dateFilter = document.getElementById('s-date').value;
    const reasonFilter = (document.getElementById('s-reason')?.value || '').trim().toLowerCase();
    const showAll = document.getElementById('show-all-history').checked;
    if (!equipmentId && !dateFilter && !reasonFilter) return alert('Enter at least one criterion');
    const parts = [];
    if (equipmentId) parts.push('Equip: ' + equipmentId);
    if (dateFilter) parts.push('Date: ' + dateFilter);
    if (reasonFilter) parts.push('Fault: ' + reasonFilter);
    await addToSearchHistory(parts.join(' · '));

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<p>Searching…</p>';

    let filtered = (updates || []).slice();
    if (equipmentId) filtered = filtered.filter(u => String(u.equipmentId || u.locoNumber || '').trim() === equipmentId);
    if (dateFilter && !(showAll && equipmentId)) filtered = filtered.filter(u => String(u.date || '') === dateFilter);
    if (reasonFilter) filtered = filtered.filter(u => String(u.reason || u.fault || '').toLowerCase().includes(reasonFilter));
    filtered = filtered.filter(u => !isUnknownEquipmentId(u.equipmentId || u.locoNumber));

    const seen = new Set();
    filtered = filtered.filter(u => {
      const key = [u.equipmentId||'', u.date||'', u.time||'', String(u.status||'').toLowerCase(), String(u.reason||'').trim().toLowerCase()].join('|');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => String((b.date||'')+' '+(b.time||'')).localeCompare(String((a.date||'')+' '+(a.time||''))));

    const profileCard = document.getElementById('equipment-profile');
    const profileBody = document.getElementById('equipment-profile-body');
    if (equipmentId && profileCard && profileBody) {
      const eq = (equipment || []).find(e => String(e.id) === equipmentId);
      const st = getEquipmentStatus(equipmentId);
      profileBody.innerHTML = [
        ['Equipment ID', equipmentId], ['Type', eq ? inferEquipmentType(eq) : '—'],
        ['Shaft', eq?.shaft || '—'], ['Work Place', eq?.level || '—'],
        ['Size', eq?.locoSize || '—'], ['SECTION', eq?.section || '—'],
        ['OEM', eq?.oem || eq?.OEM || '—'], ['Current status', st.status],
        ['Availability', st.availability + '%'], ['Last update', st.lastUpdate]
      ].map(([k, v]) => `<div><div style="font-size:0.8rem;color:var(--text-3);font-weight:600;">${k}</div><div style="font-weight:600;">${String(v).replace(/</g,'&lt;')}</div></div>`).join('');
      profileCard.style.display = 'block';
    } else if (profileCard) profileCard.style.display = 'none';

    if (!filtered.length) {
      resultsContainer.innerHTML = '<div class="alert-banner alert-predictive">No history found.</div>';
      return;
    }
    window._lastSearchHistory = filtered.slice();
    let html = `<h2 style="margin:0 0 0.75rem;"><i class="fas fa-history"></i> History (${filtered.length} events)</h2>
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">
      <thead style="background:#0f172a;color:white;"><tr>
        <th style="padding:12px;text-align:left;">Date</th><th style="padding:12px;text-align:left;">Time</th>
        <th style="padding:12px;text-align:left;">ID</th><th style="padding:12px;text-align:left;">Status</th>
        <th style="padding:12px;text-align:left;">Shift</th><th style="padding:12px;text-align:left;">Reason</th>
        <th style="padding:12px;text-align:left;">Downtime</th><th style="padding:12px;text-align:left;">Failure</th>
      </tr></thead><tbody>`;
    filtered.forEach((u, idx) => {
      html += `<tr style="border-bottom:1px solid var(--border);cursor:pointer;" onclick="showBreakdownDetail(${idx})">
        <td style="padding:10px;">${u.date||'-'}</td><td style="padding:10px;">${u.time||'-'}</td>
        <td style="padding:10px;font-weight:600;">${String(u.equipmentId||'-').replace(/</g,'&lt;')}</td>
        <td style="padding:10px;">${u.status||'-'}</td><td style="padding:10px;">${u.shift||'-'}</td>
        <td style="padding:10px;max-width:280px;white-space:normal;">${String(u.reason||'-').replace(/</g,'&lt;')}</td>
        <td style="padding:10px;">${u.downtimeHours??0}</td><td style="padding:10px;">${u.isFailure==='1'?'Yes':'No'}</td>
      </tr>`;
    });
    html += '</tbody></table></div><p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-3);">Click a row for full detail card.</p>';
    resultsContainer.innerHTML = html;
  });

  window.showBreakdownDetail = function(idx) {
    const u = (window._lastSearchHistory || [])[idx];
    if (!u) return;
    const body = document.getElementById('breakdown-detail-body');
    const modal = document.getElementById('breakdown-detail-modal');
    if (!body || !modal) return;
    const fail = u.isFailure === '1' || u.isFailure === 1 || String(u.status||'').toLowerCase() === 'down';
    const fields = [
      ['DATE REPORTED', u.date||'—'], ['TIME REPORTED', u.time||'—'],
      ['Equipment No', u.equipmentId||u.locoNumber||'—'],
      ['BREAKDOWN REPORTED', u.reason||u.fault||'—'],
      ['REPORTED BY', personFromUpdate(u, 'reported')],
      ['WORKING PLACE', u.workplace||u.level||'—'],
      ['Operation / Shaft', u.shaft||'—'],
      ['ACTUAL FAULT', u.actionTaken||u.actualFault||'—'],
      ['TIME FINISHED', u.timeFinished||u.timeOff||'—'],
      ['FIXED Y/N', String(u.status||'').toLowerCase()==='fixed' ? 'YES' : (fail ? 'NO' : u.status||'—')],
      ['WORK ORDER', u.workOrder||u.workOrderNumber||'—'],
      ['DATE FIXED', u.dateFixed||'—'], ['SIGN BY', personFromUpdate(u, 'signed')],
      ['Shift', u.shift||'—'], ['Downtime (hrs)', u.downtimeHours??u.downtime??'0'],
      ['Is Failure', fail ? 'Yes' : 'No'], ['Status', u.status||'—'], ['Source', u.source||u.sourceSheet||'—'],
      ['Changed by', personFromUpdate(u, 'changed')],
      ['Changed at', u.changedAt || ([u.date, u.time].filter(Boolean).join(' ') || '—')]
    ];
    body.innerHTML = fields.map(([k, v]) => `<div style="background:var(--surface-2);border-radius:8px;padding:0.65rem 0.85rem;border:1px solid var(--border);">
      <div style="font-size:0.78rem;color:var(--text-3);font-weight:600;text-transform:uppercase;margin-bottom:0.25rem;">${k}</div>
      <div style="font-weight:600;word-break:break-word;">${String(v==null||v===''?'—':v).replace(/</g,'&lt;')}</div>
    </div>`).join('');
    if (modal && modal.id) openModal(modal.id); else if (modal) { modal.classList.add('active'); ModalStack._lockBody(); }
  };

  // ── Import ───────────────────────────────────────────────────
  let rawSheetData = {}, currentSheetName = '';
  const TARGET_FIELDS = {
    date: ['date reported','date fixed','date','report date','failure date'],
    time: ['time reported','time','start time'],
    equipmentId: ['loco number','equipment id','equipment','loco','machine'],
    workplace: ['working place','location','level'],
    reason: ['breakdown reported','breakdown','fault','failure','reason','problem','description'],
    actualFault: ['actual fault found by','actual fault found','fault found'],
    downtime: ['total downtime','downtime','down hrs','hours'],
    shift: ['shift'],
    operator: ['reported by','operator','reported by name'],
    reportedByCompany: ['reported by company number','reported by company no','reporter company number','company number','company no','payroll number','employee number','emp no','persal'],
    signedBy: ['sign by','signed by','fixed by'],
    signedByCompany: ['signed by company number','sign by company number','signed by company no','fixer company number'],
    action: ['actual fault found by','action taken','fixed y/n'],
    shaft: ['conventional','shaft','section','area']
  };
  function normalizeHeader(h) { return String(h||'').toLowerCase().replace(/[\s_\-\/\\:]+/g,' ').trim(); }
  function parseExcelDate(val) {
    if (val == null || val === '') return null;
    if (val instanceof Date && !isNaN(val)) return val.toISOString().slice(0,10);
    if (typeof val === 'number' && XLSX?.SSF) {
      try { const d = XLSX.SSF.parse_date_code(val); if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; } catch(e){}
    }
    const s = String(val).trim();
    const m = s.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    return null;
  }
  function parseExcelTime(val) {
    if (val == null || val === '') return '00:00';
    if (val instanceof Date && !isNaN(val.getTime())) return val.toTimeString().slice(0,5);
    if (typeof val === 'number' && val >= 0 && val < 1) {
      const total = Math.round(val * 24 * 60);
      return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    }
    const s = String(val).trim().toUpperCase().replace(/H/g,':');
    const m = s.match(/(\d{1,2})[:.](\d{2})/);
    return m ? `${m[1].padStart(2,'0')}:${m[2]}` : '00:00';
  }
  function fillImportShaftSelect() {
    const sel = document.getElementById('import-shaft');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">Auto-detect</option>' + RBE_SHAFTS.map(s => `<option value="${s}">${s}</option>`).join('');
    if (prev) sel.value = prev;
  }
  window.handleFileUpload = function() {
    fillImportShaftSelect();
    const fileInput = document.getElementById('excel-file');
    const statusDiv = document.getElementById('import-status');
    if (!fileInput?.files?.[0]) return alert('Select a file first');
    if (typeof XLSX === 'undefined') return alert('Excel library not loaded');
    statusDiv.style.display = 'block'; statusDiv.innerHTML = 'Reading…'; statusDiv.style.background = 'rgba(29,78,216,0.08)'; statusDiv.style.color = 'var(--primary)';
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        rawSheetData = {}; let totalRows = 0;
        workbook.SheetNames.forEach(name => {
          const sheet = workbook.Sheets[name];
          if (!sheet || !sheet['!ref']) return;
          const range = XLSX.utils.decode_range(sheet['!ref']);
          const headers = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
            headers.push(cell?.v != null ? String(cell.v).trim() : `Col${c}`);
          }
          const rows = [];
          for (let r = range.s.r + 1; r <= range.e.r; r++) {
            const rowObj = {}; let hasData = false;
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = sheet[XLSX.utils.encode_cell({ r, c })];
              const val = cell?.v != null ? cell.v : null;
              if (val != null && String(val).trim() !== '') hasData = true;
              rowObj[headers[c - range.s.c]] = val;
            }
            if (hasData) rows.push(rowObj);
          }
          if (rows.length) { rawSheetData[name] = { headers, rows, sheetName: name }; totalRows += rows.length; }
        });
        if (!Object.keys(rawSheetData).length) {
          statusDiv.innerHTML = '❌ No usable data'; statusDiv.style.background = 'rgba(220,38,38,0.1)'; statusDiv.style.color = 'var(--danger)';
          return;
        }
        currentSheetName = Object.keys(rawSheetData)[0];
        processCurrentSheet();
        statusDiv.innerHTML = `✅ Found ${Object.keys(rawSheetData).length} sheet(s). Preview: ${excelData.length} cleaned rows.`;
        statusDiv.style.background = 'rgba(22,163,74,0.1)'; statusDiv.style.color = 'var(--success)';
        document.querySelectorAll('.import-step').forEach(el => el.classList.remove('active'));
        document.querySelector('.import-step[data-step="2"]')?.classList.add('active');
      } catch (err) {
        statusDiv.innerHTML = `❌ ${err.message}`; statusDiv.style.background = 'rgba(220,38,38,0.1)'; statusDiv.style.color = 'var(--danger)';
      }
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
  };
  function processCurrentSheet() {
    const sheet = rawSheetData[currentSheetName];
    if (!sheet) return;
    availableColumns = sheet.headers;
    const mapping = {}; const norm = {};
    sheet.headers.forEach(h => { norm[normalizeHeader(h)] = h; });
    for (const [field, names] of Object.entries(TARGET_FIELDS)) {
      for (const name of names) { if (norm[name]) { mapping[field] = norm[name]; break; } }
      if (!mapping[field]) {
        for (const h of sheet.headers) {
          for (const c of (TARGET_FIELDS[field] || [])) {
            if (normalizeHeader(h).includes(normalizeHeader(c)) && normalizeHeader(c).length >= 4) { mapping[field] = h; break; }
          }
          if (mapping[field]) break;
        }
      }
    }
    selectedMapping = mapping;
    excelData = sheet.rows.map((row, idx) => {
      const get = f => selectedMapping[f] != null ? row[selectedMapping[f]] : null;
      let equip = String(get('equipmentId') || '').trim().replace(/^LOCO\s+/i, '').replace(/[\/\\#?[\]]+/g, '-').trim();
      let reason = String(get('reason') || '').trim();
      const actual = String(get('actualFault') || get('action') || '').trim();
      if (!reason && actual) reason = actual;
      else if (reason && actual && actual.length > 3) reason = reason + ' | ' + actual;
      if (!reason) reason = 'No reason provided';
      const opRaw = String(get('operator') || '').trim();
      const reportedCnRaw = String(get('reportedByCompany') || '').trim();
      const signedRaw = String(get('signedBy') || '').trim();
      const signedCnRaw = String(get('signedByCompany') || '').trim();
      let operatorName = opRaw, reportedByCompanyNumber = reportedCnRaw;
      if (!reportedByCompanyNumber && looksLikeCompanyNumber(opRaw)) {
        reportedByCompanyNumber = opRaw;
        operatorName = '';
      }
      let signedByName = signedRaw, signedByCompanyNumber = signedCnRaw;
      if (!signedByCompanyNumber && looksLikeCompanyNumber(signedRaw)) {
        signedByCompanyNumber = signedRaw;
        signedByName = '';
      }
      return {
        _rawIndex: idx, date: parseExcelDate(get('date')) || new Date().toISOString().slice(0,10),
        time: parseExcelTime(get('time')), equipmentId: equip || 'Unknown', reason,
        downtimeHours: parseFloat(get('downtime')) || 0, shift: String(get('shift') || 'Night').trim() || 'Night',
        operator: operatorName, reportedByCompanyNumber, signedBy: signedByName, signedByCompanyNumber,
        action: actual,
        workplace: String(get('workplace') || '').trim(),
        shaft: document.getElementById('import-shaft')?.value || '',
        sourceSheet: currentSheetName, selected: true
      };
    }).filter(r => {
      const id = String(r.equipmentId || '').trim();
      return id && !/^unknown$/i.test(id) && r.reason && r.reason !== 'No reason provided';
    });
    renderPreview();
    document.getElementById('mapping-preview').style.display = 'block';
  }
  function renderPreview() {
    const table = document.getElementById('preview-table');
    const countEl = document.getElementById('preview-count');
    if (!table) return;
    if (!excelData.length) { table.innerHTML = '<tbody><tr><td colspan="9">No valid rows</td></tr></tbody>'; return; }
    if (countEl) countEl.textContent = `(${excelData.filter(r => r.selected).length} of ${excelData.length} selected)`;
    let html = `<thead><tr><th style="width:40px;"><input type="checkbox" checked onchange="toggleAllRows(this.checked)"></th><th>#</th><th>Date</th><th>Time</th><th>ID</th><th>Reason</th><th>Downtime</th><th>Shift</th><th>Sheet</th></tr></thead><tbody>`;
    excelData.forEach((row, i) => {
      html += `<tr style="${row.selected?'':'opacity:0.45;'}"><td><input type="checkbox" ${row.selected?'checked':''} onchange="excelData[${i}].selected=this.checked;renderPreview();"></td>
        <td>${i+1}</td><td>${row.date}</td><td>${row.time}</td><td>${row.equipmentId}</td>
        <td style="max-width:280px;white-space:normal;">${String(row.reason).replace(/</g,'&lt;')}</td>
        <td>${row.downtimeHours}</td><td>${row.shift}</td><td>${row.sourceSheet}</td></tr>`;
    });
    table.innerHTML = html + '</tbody>';
  }
  window.toggleAllRows = checked => { excelData.forEach(r => r.selected = checked); renderPreview(); };
  window.showManualMapping = function() {
    if (!availableColumns.length) return alert('Parse a file first');
    const panel = document.getElementById('manual-mapping-panel');
    const container = document.getElementById('mapping-fields');
    panel.style.display = 'block';
    const fields = [{key:'date',label:'Date'},{key:'time',label:'Time'},{key:'equipmentId',label:'Equipment ID'},{key:'reason',label:'Reason'},{key:'downtime',label:'Downtime'},{key:'shift',label:'Shift'}];
    container.innerHTML = fields.map(f => `<div><label style="font-size:0.9rem;font-weight:600;">${f.label}</label>
      <select id="map-${f.key}" style="width:100%;padding:0.55rem;border-radius:8px;border:1px solid var(--border);">
        <option value="">— not mapped —</option>
        ${availableColumns.map(c => `<option value="${c}" ${selectedMapping[f.key]===c?'selected':''}>${c}</option>`).join('')}
      </select></div>`).join('');
  };
  window.applyManualMapping = function() {
    ['date','time','equipmentId','reason','downtime','shift'].forEach(k => {
      const sel = document.getElementById('map-' + k);
      if (sel) selectedMapping[k] = sel.value || null;
    });
    processCurrentSheet();
    document.getElementById('manual-mapping-panel').style.display = 'none';
  };
  window.cleanupDuplicateStatusUpdates = async function() {
    if (!can('delete_equipment') && (currentUserRole || '') !== 'admin') {
      // Strict: admin only (can('delete_equipment') is admin-only in this app)
      showToast('Only admins can clean up duplicates', 'error');
      return;
    }
    if (!confirm('This will permanently delete duplicate status updates from the database.\\n\\nOne record is kept per unique event (equipment + date + time + status + reason).\\n\\nContinue?')) return;

    const statusEl = document.getElementById('cleanup-status');
    const btn = document.getElementById('btn-cleanup-duplicates');
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.background = 'rgba(29,78,216,0.08)';
      statusEl.style.color = 'var(--primary)';
      statusEl.innerHTML = 'Scanning status_updates…';
    }
    if (btn) btn.disabled = true;

    try {
      const snap = await getDocs(collection(db, 'status_updates'));
      const groups = new Map(); // fingerprint -> [{ ref, data, score }]
      snap.forEach(d => {
        const data = d.data();
        const fp = statusUpdateFingerprint(data);
        const list = groups.get(fp) || [];
        // Prefer: has createdAt, has updatedBy, not re-imported noise — score higher = keep
        let score = 0;
        if (data.createdAt) score += 3;
        if (data.updatedByEmail || data.updatedBy) score += 2;
        if (data.source && String(data.source).toLowerCase().indexOf('import') === -1) score += 1;
        if (data.changedAt) score += 1;
        // Prefer earlier createdAt when scores equal (stable audit)
        let createdMs = 0;
        try {
          if (data.createdAt && typeof data.createdAt.toMillis === 'function') createdMs = data.createdAt.toMillis();
          else if (data.changedAt) createdMs = new Date(data.changedAt).getTime() || 0;
          else if (data.date) createdMs = new Date(String(data.date) + 'T' + String(data.time || '00:00')).getTime() || 0;
        } catch (e) {}
        list.push({ ref: d.ref, id: d.id, score, createdMs, data });
        groups.set(fp, list);
      });

      let toDelete = [];
      let uniqueGroups = 0;
      let multiGroups = 0;
      groups.forEach(list => {
        uniqueGroups++;
        if (list.length <= 1) return;
        multiGroups++;
        // Sort: highest score first, then earliest createdMs, then id
        list.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.createdMs !== b.createdMs) return a.createdMs - b.createdMs;
          return String(a.id).localeCompare(String(b.id));
        });
        // Keep list[0], delete the rest
        for (let i = 1; i < list.length; i++) toDelete.push(list[i]);
      });

      if (statusEl) {
        statusEl.innerHTML = `Found <strong>${snap.size}</strong> records · <strong>${multiGroups}</strong> groups with duplicates · will delete <strong>${toDelete.length}</strong>…`;
      }

      if (!toDelete.length) {
        if (statusEl) {
          statusEl.style.background = 'rgba(22,163,74,0.12)';
          statusEl.style.color = 'var(--success)';
          statusEl.innerHTML = '✅ No duplicates found. Database is clean.';
        }
        showToast('No duplicates found', 'success');
        if (btn) btn.disabled = false;
        return;
      }

      let deleted = 0, failed = 0;
      // Batch delete in small chunks to avoid overwhelming client
      for (let i = 0; i < toDelete.length; i++) {
        try {
          await deleteDoc(toDelete[i].ref);
          deleted++;
        } catch (e) {
          failed++;
          console.warn('Failed to delete', toDelete[i].id, e);
        }
        if ((i + 1) % 25 === 0 || i === toDelete.length - 1) {
          if (statusEl) {
            statusEl.innerHTML = `Deleting… <strong>${deleted}</strong> removed, <strong>${failed}</strong> failed (${i + 1}/${toDelete.length})`;
          }
        }
      }

      if (statusEl) {
        statusEl.style.background = failed ? 'rgba(234,88,12,0.12)' : 'rgba(22,163,74,0.12)';
        statusEl.style.color = failed ? 'var(--warning)' : 'var(--success)';
        statusEl.innerHTML = `🎉 Cleanup complete. Deleted <strong>${deleted}</strong> duplicate record(s).` +
          (failed ? ` <strong>${failed}</strong> failed.` : '') +
          ` Unique events kept: <strong>${uniqueGroups}</strong>.`;
      }
      showToast(`Removed ${deleted} duplicate status updates`, 'success');
      // Live listener will refresh updates automatically
      if (typeof populateDashboard === 'function') populateDashboard();
      if (typeof refreshTextMiningInsights === 'function') refreshTextMiningInsights();
    } catch (err) {
      console.error(err);
      if (statusEl) {
        statusEl.style.background = 'rgba(220,38,38,0.1)';
        statusEl.style.color = 'var(--danger)';
        statusEl.innerHTML = '❌ Cleanup failed: ' + (err.message || String(err));
      }
      showToast('Cleanup failed: ' + (err.message || String(err)), 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.importSelectedRows = async function() {
    if (!can('import')) {
      showToast('Your role cannot import reports', 'error');
      return;
    }
    const importShaft = document.getElementById('import-shaft')?.value || '';
    if (importShaft && !assertCan('import', { shaft: importShaft }, 'Not authorized for this shaft')) return;
    const toImport = excelData.filter(r => r.selected);
    if (!toImport.length) return showToast('No rows selected', 'error');
    const actor = getActor();
    const statusDiv = document.getElementById('import-status');
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(29,78,216,0.08)';
    statusDiv.style.color = 'var(--primary)';
    statusDiv.innerHTML = `Checking against existing records…`;

    // Build lookup of existing status_updates so already-imported rows are skipped
    const existingExact = new Set();
    const existingSoft = new Set();
    try {
      const snap = await getDocs(collection(db, 'status_updates'));
      snap.forEach(d => {
        const u = d.data();
        existingExact.add(statusUpdateFingerprint(u));
        existingSoft.add(statusUpdateSoftKey(u));
      });
    } catch (err) {
      console.warn('Could not load existing updates for de-dupe', err);
    }
    // Also include in-memory updates (live listener may already have them)
    (updates || []).forEach(u => {
      existingExact.add(statusUpdateFingerprint(u));
      existingSoft.add(statusUpdateSoftKey(u));
    });

    // Skip duplicates within the spreadsheet itself
    const batchExact = new Set();
    const batchSoft = new Set();

    statusDiv.innerHTML = `Importing <strong>${toImport.length}</strong> records (skipping already-in-system)…`;
    let success = 0, skipped = 0, skippedDuplicate = 0;
    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i];
      try {
        const rawId = String(row.equipmentId || '').trim();
        const equipId = sanitizeEquipmentId(rawId);
        if (!equipId) { skipped++; continue; }
        const statusPayload = {
          equipmentId: equipId, date: row.date, time: row.time, status: 'Down', shift: row.shift || 'Night',
          reason: row.reason, downtimeHours: Number(row.downtimeHours) || 0, isFailure: '1',
          operator: row.operator || '',
          reportedBy: row.operator || '',
          reportedByCompanyNumber: row.reportedByCompanyNumber || '',
          signedBy: row.signedBy || '',
          signedByCompanyNumber: row.signedByCompanyNumber || '',
          shaft: row.shaft || '', workplace: row.workplace || '',
          source: 'Imported Breakdown Report', sourceSheet: row.sourceSheet || '', createdAt: serverTimestamp(),
          updatedBy: actor.name, updatedByEmail: actor.email, updatedByUid: actor.uid,
          updatedByCompanyNumber: actor.companyNumber || '',
          changedAt: new Date().toISOString()
        };
        if (rawId && rawId !== equipId) statusPayload.originalEquipmentId = rawId;

        const fp = statusUpdateFingerprint(statusPayload);
        const soft = statusUpdateSoftKey(statusPayload);
        if (existingExact.has(fp) || existingSoft.has(soft) || batchExact.has(fp) || batchSoft.has(soft)) {
          skippedDuplicate++;
          skipped++;
          continue;
        }

        await addDoc(collection(db, 'status_updates'), statusPayload);
        await setDoc(doc(db, 'equipment', equipId), {
          shaft: row.shaft || '', level: row.workplace || '',
          equipmentType: (typeof inferEquipmentType === 'function') ? inferEquipmentType(equipId) : 'Loco',
          source: 'Imported Breakdown Report', updatedAt: new Date().toISOString(),
          updatedBy: actor.name, updatedByEmail: actor.email
        }, { merge: true });
        batchExact.add(fp);
        batchSoft.add(soft);
        existingExact.add(fp);
        existingSoft.add(soft);
        success++;
      } catch (e) { skipped++; }
      if ((i + 1) % 20 === 0 || i === toImport.length - 1) {
        statusDiv.innerHTML = `Importing… <strong>${success}</strong> saved, <strong>${skippedDuplicate}</strong> already in system, <strong>${skipped - skippedDuplicate}</strong> other skipped (${i + 1}/${toImport.length})`;
      }
    }
    statusDiv.innerHTML = `🎉 Imported <strong>${success}</strong> new records. Skipped <strong>${skippedDuplicate}</strong> already in system` +
      (skipped - skippedDuplicate ? `, <strong>${skipped - skippedDuplicate}</strong> other` : '') + `.`;
    statusDiv.style.background = 'rgba(22,163,74,0.12)'; statusDiv.style.color = 'var(--success)';
    showToast(success ? `Imported ${success} new records (${skippedDuplicate} duplicates skipped)` : `No new records — ${skippedDuplicate} already in system`, success ? 'success' : 'info');
    if (typeof logAudit === 'function' && success) logAudit('import_breakdown', `Imported ${success} records (${skippedDuplicate} duplicates skipped)`, '');
    document.querySelectorAll('.import-step').forEach(el => el.classList.remove('active'));
    document.querySelector('.import-step[data-step="3"]')?.classList.add('active');
    if (typeof fillDatalist === 'function') fillDatalist();
    if (typeof populateShaftFilter === 'function') populateShaftFilter();
    if (typeof refreshTextMiningInsights === 'function') refreshTextMiningInsights();
    if (typeof populateDashboard === 'function') populateDashboard();
    if (can('text_mining')) show('text-mining');
    else show('dashboard');
  };


  // ── User Management (admin) ──────────────────────────────────
  function getKnownShaftsList() {
    const shafts = (typeof RBE_SHAFTS !== 'undefined' ? RBE_SHAFTS.slice() : []);
    (equipment || []).forEach(e => {
      const s = String(e.shaft || '').trim();
      if (s && !shafts.includes(s)) shafts.push(s);
    });
    return shafts.sort();
  }

  function fillInviteShaftSelect() {
    const sel = document.getElementById('invite-shafts');
    if (!sel) return;
    const shafts = getKnownShaftsList();
    sel.innerHTML = shafts.map(s => `<option value="${s}">${s}</option>`).join('');
  }

  window.selectAllInviteShafts = function(on) {
    const sel = document.getElementById('invite-shafts');
    if (!sel) return;
    [...sel.options].forEach(o => { o.selected = !!on; });
  };

  async function refreshUserAdminList() {
    const tbody = document.getElementById('user-admin-tbody');
    if (!tbody) return;
    if (currentUserRole !== 'admin') {
      tbody.innerHTML = '<tr><td colspan="5">Admin only</td></tr>';
      return;
    }
    fillInviteShaftSelect();
    tbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    try {
      const snap = await getDocs(collection(db, 'users'));
      const rows = [];
      snap.forEach(d => {
        const u = d.data() || {};
        rows.push({ id: d.id, ...u });
      });
      rows.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5">No user profiles yet.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(u => {
        const shafts = Array.isArray(u.allowedShafts) ? u.allowedShafts : [];
        const shaftLabel = shafts.length > 4 ? shafts.slice(0, 4).join(', ') + '…' : (shafts.join(', ') || '—');
        const status = u.status || 'active';
        const escId = String(u.id).replace(/'/g, "\\'");
        return `<tr>
          <td>${String(u.email || u.id).replace(/</g,'&lt;')}</td>
          <td><span class="role-badge ${u.role || 'viewer'}">${u.role || '—'}</span></td>
          <td>${status}</td>
          <td style="max-width:220px;font-size:0.82rem;" title="${shafts.join(', ').replace(/"/g,'&quot;')}">${shaftLabel.replace(/</g,'&lt;')}</td>
          <td style="white-space:nowrap;">
            <button type="button" class="btn btn-primary" style="padding:0.3rem 0.55rem;font-size:0.78rem;" onclick="editUserAdmin('${escId}')">Edit</button>
            <button type="button" class="btn btn-danger" style="padding:0.3rem 0.55rem;font-size:0.78rem;" onclick="setUserStatus('${escId}','disabled')">Disable</button>
            <button type="button" class="btn btn-success" style="padding:0.3rem 0.55rem;font-size:0.78rem;" onclick="setUserStatus('${escId}','active')">Enable</button>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5">Error: ${String(err.message || err).replace(/</g,'&lt;')}</td></tr>`;
    }
  }
  window.refreshUserAdminList = refreshUserAdminList;

  window.editUserAdmin = async function(uid) {
    if (currentUserRole !== 'admin') return showToast('Admin only', 'error');
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return showToast('User not found', 'error');
      const u = snap.data() || {};
      const role = prompt('Role (admin|reliability|operations|executive|viewer)', u.role || 'operations');
      if (role == null) return;
      const r = String(role).toLowerCase().trim();
      if (!VALID_ROLES.includes(r)) return showToast('Invalid role', 'error');
      const currentShafts = Array.isArray(u.allowedShafts) ? u.allowedShafts.join(', ') : '';
      const shaftsStr = prompt('Allowed shafts (comma-separated; leave empty for none)', currentShafts);
      if (shaftsStr == null) return;
      const allowedShafts = shaftsStr.split(',').map(s => s.trim()).filter(Boolean);
      await setDoc(doc(db, 'users', uid), {
        role: r,
        allowedShafts,
        updatedAt: new Date().toISOString(),
        updatedBy: (auth.currentUser && auth.currentUser.email) || 'admin'
      }, { merge: true });
      logAudit('role_scope_change', `Updated ${u.email || uid}: role=${r}, shafts=${allowedShafts.length}`, '', { source: 'ui' });
      showToast('User updated', 'success');
      refreshUserAdminList();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  window.setUserStatus = async function(uid, status) {
    if (currentUserRole !== 'admin') return showToast('Admin only', 'error');
    try {
      await setDoc(doc(db, 'users', uid), { status: status, updatedAt: new Date().toISOString() }, { merge: true });
      logAudit('user_status_change', `Set ${uid} status=${status}`, '', { source: 'ui' });
      showToast('Status set to ' + status, 'success');
      refreshUserAdminList();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  document.getElementById('invite-user-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (currentUserRole !== 'admin') return showToast('Admin only', 'error');
    const email = document.getElementById('invite-email').value.trim().toLowerCase();
    const role = document.getElementById('invite-role').value;
    const company = document.getElementById('invite-company').value.trim();
    const sel = document.getElementById('invite-shafts');
    const allowedShafts = sel ? [...sel.selectedOptions].map(o => o.value) : [];
    const statusEl = document.getElementById('invite-status');
    if (!email || !VALID_ROLES.includes(role)) {
      if (statusEl) statusEl.textContent = 'Valid email and role required';
      return;
    }
    // Store pending invite under users_invites/{emailHash} and also try to find existing uid by email is not possible client-side.
    // Client-side: write to invites collection; admin must create Auth user in console / Admin SDK.
    try {
      const inviteId = email.replace(/[^a-z0-9]/g, '_');
      await setDoc(doc(db, 'user_invites', inviteId), {
        email, role, allowedShafts, companyNumber: company,
        status: 'pending',
        invitedBy: (auth.currentUser && auth.currentUser.email) || '',
        invitedByUid: (auth.currentUser && auth.currentUser.uid) || '',
        createdAt: new Date().toISOString()
      });
      // If a users doc already exists with this email, update it (scan)
      const snap = await getDocs(collection(db, 'users'));
      let matched = 0;
      for (const d of snap.docs) {
        const data = d.data() || {};
        if (String(data.email || '').toLowerCase() === email) {
          await setDoc(d.ref, {
            role, allowedShafts, companyNumber: company || data.companyNumber || '',
            status: 'pending', updatedAt: new Date().toISOString()
          }, { merge: true });
          matched++;
        }
      }
      logAudit('user_invite', `Invited ${email} role=${role} shafts=${allowedShafts.length}`, '', { source: 'ui' });
      if (statusEl) {
        statusEl.style.color = 'var(--success)';
        statusEl.innerHTML = matched
          ? `✅ Updated existing profile for <strong>${email}</strong> (status pending until next login).`
          : `✅ Invite saved for <strong>${email}</strong>. Create the Firebase Auth user (Admin SDK / Console) or send password-reset link; on first login profile will attach if email matches an invite.`;
      }
      showToast('Invite saved', 'success');
      e.target.reset();
      fillInviteShaftSelect();
      refreshUserAdminList();
    } catch (err) {
      if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = 'Error: ' + err.message; }
      showToast('Invite failed: ' + err.message, 'error');
    }
  });

  // ── Initial ──────────────────────────────────────────────────
  fillDatalist();
  populateShaftFilter();
  show('dashboard');
