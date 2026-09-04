/**
 * RBE Monitor – supporting script.js
 * ----------------------------------
 * The main application logic (Firebase modular SDK, dashboard, text-mining
 * classifier, Excel import, etc.) lives in the inline <script type="module">
 * inside index.html.
 *
 * This file provides the Search History helper that is referenced by the
 * HTML. It is intentionally lightweight and does not re-initialise Firebase
 * so that it does not conflict with the modular code.
 *
 * If you later want to extract the text-mining functions (tmClassifyReason,
 * refreshTextMiningInsights, etc.) into a separate module, you can move them
 * here and export them; the current design keeps everything in one place for
 * simplicity and offline reliability.
 */

// ---------------------------------------------------------------------------
// Search-history helpers (used by the Search History section)
// ---------------------------------------------------------------------------

// These functions are also defined inside the main module; they are repeated
// here only so that any non-module code that might call them continues to work.
// The live implementation that writes to Firestore lives in the module.

window.addToSearchHistory = window.addToSearchHistory || async function (jobOrderNumber, pdfName = '') {
  console.log('[script.js] addToSearchHistory called – main module should handle persistence:', jobOrderNumber);
};

window.clearSearchHistory = window.clearSearchHistory || async function () {
  if (confirm('Clear all search history?')) {
    console.log('[script.js] clearSearchHistory – implement via main module if needed');
  }
};

// ---------------------------------------------------------------------------
// Optional: expose a global reference to the rule-based classifier for
// console testing / future external scripts.
// (The real implementation is defined inside the module as tmClassifyReason.)
// ---------------------------------------------------------------------------
window.RBE_TextMining = window.RBE_TextMining || {
  /**
   * Rule-based text classifier – same categories as the research study
   * (Brakes / Binding, Antenna / Comms / Display, etc.)
   * The authoritative version lives in the HTML module.
   */
  classify(text) {
    if (typeof window.tmClassifyReason === 'function') {
      return window.tmClassifyReason(text);
    }
    // Fallback pure implementation (mirrors the study categories)
    const t = String(text || '').toLowerCase();
    if (!t.trim()) return { mode: 'No text', color: '#94a3b8' };
    if (/derail/.test(t)) return { mode: 'Derailment', color: '#7c3aed' };
    if (/brake|binding|brake interface|brake release|static brake/.test(t))
      return { mode: 'Brakes / Binding', color: '#dc2626' };
    if (/battery|cell|charger/.test(t)) return { mode: 'Battery / Cells', color: '#16a34a' };
    if (/antenna|gabooz|gabboz|pulse|network|rf\b|canbus|can bus|check connection/.test(t))
      return { mode: 'Antenna / Comms / Display', color: '#1d4ed8' };
    if (/light|siren|speedo|screen|display/.test(t))
      return { mode: 'Lights / Siren / Speedo / Display', color: '#0891b2' };
    if (/motor|gear|power|control|movement|tram|not starting|no forward|no backward|hydraulic/.test(t))
      return { mode: 'Motor / Power / Control / Movement', color: '#ea580c' };
    if (/door|magnet|buffer/.test(t)) return { mode: 'Door / Magnet / Buffer', color: '#ca8a04' };
    return { mode: 'Other / Unclassified', color: '#64748b' };
  }
};

console.log('%c✅ RBE script.js loaded (search-history helper + text-mining fallback)', 'color:#16a34a;font-weight:bold');
