/* Ask RBE v3.1 — grounded Q&A: interpretation, memory, app-aligned helpers */
(function () {
  var fab = document.getElementById('rbe-chat-fab');
  var panel = document.getElementById('rbe-chat-panel');
  var msgs = document.getElementById('rbe-chat-messages');
  var input = document.getElementById('rbe-chat-input');
  var sendBtn = document.getElementById('rbe-chat-send');
  var closeBtn = document.getElementById('rbe-chat-close');
  var clearBtn = document.getElementById('rbe-chat-clear');
  if (!fab || !panel || !msgs || !input) return;

  /* one-turn context for follow-ups */
  var lastCtx = { equipId: null, shaft: null, type: null, topic: null, periodKey: null };
  var welcomePoll = null;

  function api() { return window.RBE || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function addMsg(html, role) {
    var div = document.createElement('div');
    div.className = 'rbe-msg ' + role;
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  function showTyping() {
    var d = addMsg('<div class="rbe-typing"><span></span><span></span><span></span></div>', 'bot');
    d.setAttribute('data-typing', '1');
  }
  function removeTyping() {
    msgs.querySelectorAll('[data-typing]').forEach(function (el) { el.remove(); });
  }

  function dataReady() {
    var r = api();
    if (!r) return false;
    return (r.equipment && r.equipment.length) || (r.updates && r.updates.length);
  }

  function welcome() {
    msgs.innerHTML = '';
    var r = api();
    var nEq = r && r.equipment ? r.equipment.length : 0;
    var nUp = r && r.updates ? r.updates.length : 0;
    var nMt = r && r.maintenance ? r.maintenance.length : 0;
    var ready = dataReady();
    var chip = filterChip();
    addMsg(
      '<strong>Ask RBE</strong> — ask about equipment, faults, shafts, downtime, counts, or maintenance.<br><br>' +
      'Examples: <em>brake faults on 11 shaft this week</em> · <em>which loco has highest downtime</em> · ' +
      '<em>who reported antenna issues</em> · <em>overdue maintenance</em> · <em>is 511 safe to use?</em>' +
      '<div class="meta" style="margin-top:0.5rem">' +
      (ready
        ? ('Live data linked: ' + nEq + ' equipment · ' + nUp + ' status events · ' + nMt + ' maintenance · scope ' + esc(chip))
        : 'Waiting for data… Sign in and stay on the site until equipment loads, then ask again.') +
      '</div>',
      'bot'
    );
  }

  function refreshWelcomeIfNeeded() {
    if (!panel.classList.contains('open')) return;
    if (!dataReady()) return;
    var first = msgs.querySelector('.rbe-msg.bot');
    if (first && /Waiting for data/i.test(first.textContent || '')) welcome();
  }

  function startWelcomePoll() {
    if (welcomePoll) return;
    welcomePoll = setInterval(function () {
      refreshWelcomeIfNeeded();
      if (dataReady() && welcomePoll) {
        clearInterval(welcomePoll);
        welcomePoll = null;
      }
    }, 1200);
  }

  function openChat() {
    panel.classList.add('open');
    fab.classList.add('open');
    fab.innerHTML = '<i class="fas fa-times"></i>';
    if (!msgs.children.length) welcome();
    else refreshWelcomeIfNeeded();
    startWelcomePoll();
    setTimeout(function () { input.focus(); }, 80);
  }
  function closeChat() {
    panel.classList.remove('open');
    fab.classList.remove('open');
    fab.innerHTML = '<i class="fas fa-comments"></i>';
  }
  fab.onclick = function () { panel.classList.contains('open') ? closeChat() : openChat(); };
  if (closeBtn) closeBtn.onclick = closeChat;
  if (clearBtn) clearBtn.onclick = function () {
    lastCtx = { equipId: null, shaft: null, type: null, topic: null, periodKey: null };
    welcome();
  };
  if (sendBtn) sendBtn.onclick = send;
  input.onkeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  function safe(fn, fb) {
    try { return fn(); } catch (e) { console.warn('[AskRBE]', e); return fb; }
  }

  /* ── App-aligned data access (no silent full-list fallback when filters intentionally empty) ── */
  function filteredEq() {
    var r = api(); if (!r) return [];
    return safe(function () { return r.getFilteredEquipment(); }, []) || [];
  }
  function filteredUp() {
    var r = api(); if (!r) return [];
    return safe(function () { return r.getFilteredUpdates(); }, []) || [];
  }
  function allScopedUp() {
    var r = api(); if (!r) return [];
    return safe(function () { return r.getScopedUpdates(); }, []) || [];
  }
  function filteredMt() {
    var r = api(); if (!r) return [];
    return safe(function () { return r.getFilteredMaintenance(); }, []) || [];
  }
  function eqStatus(id) {
    var r = api(); return r ? safe(function () { return r.getEquipmentStatus(id); }, null) : null;
  }
  function relMetrics(id) {
    var r = api(); return r ? safe(function () { return r.getReliabilityMetrics(id); }, null) : null;
  }
  function isFail(u) {
    var r = api();
    if (r && r.isFailureEvent) return !!r.isFailureEvent(u);
    return !!(u && (u.isFailure === '1' || u.isFailure === 1 || String(u.status || '').toLowerCase() === 'down'));
  }
  function nextDue(lastDone, interval) {
    var r = api();
    if (r && r.calculateNextDue) return r.calculateNextDue(lastDone, interval) || '';
    return '';
  }
  function periodLabel() {
    var r = api();
    var p = r ? safe(function () { return r.getSystemPeriod(); }, null) : null;
    return (p && (p.label || p.key)) || 'selected period';
  }
  function periodKey() {
    var r = api();
    var p = r ? safe(function () { return r.getSystemPeriod(); }, null) : null;
    return (p && p.key) || 'weekly';
  }
  function filterChip() {
    var r = api();
    if (!r) return 'All Shafts · All Types';
    var sh = r.currentShaftFilter;
    var ty = r.currentTypeFilter;
    return (sh || 'All Shafts') + ' · ' + (ty || 'All Types');
  }
  function normId(id) {
    var r = api();
    if (r && r.normaliseEquipId) return r.normaliseEquipId(id);
    return String(id || '').trim().toUpperCase();
  }
  function inferType(e) {
    var r = api();
    if (r && r.inferEquipmentType) return r.inferEquipmentType(e);
    return (e && (e.equipmentType || e.type)) || '—';
  }

  /* ── Lexicon: stop words, plurals, synonyms, stems ── */
  var STOP = {
    a:1, an:1, the:1, is:1, are:1, was:1, were:1, be:1, been:1, being:1, to:1, of:1, in:1, on:1, for:1,
    with:1, without:1, from:1, by:1, at:1, as:1, and:1, or:1, not:1, no:1, yes:1, which:1, what:1, who:1,
    when:1, where:1, how:1, many:1, much:1, any:1, all:1, some:1, please:1, show:1, list:1, tell:1, me:1,
    about:1, give:1, find:1, get:1, can:1, you:1, we:1, i:1, do:1, does:1, did:1, has:1, have:1, had:1,
    there:1, their:1, this:1, that:1, these:1, those:1, our:1, your:1, my:1, currently:1, current:1,
    equipment:1, equipments:1, asset:1, assets:1, unit:1, units:1, machine:1, machines:1, item:1, items:1,
    shaft:1, shafts:1, status:1, statuses:1, report:1, reports:1, data:1, system:1, need:1, needs:1,
    want:1, looking:1, see:1, check:1, info:1, information:1, details:1, detail:1, its:1, it:1, them:1,
    also:1, just:1, only:1, still:1, very:1, more:1, less:1, than:1, then:1, vs:1, versus:1
  };
  /* words that look like IDs but are type plurals / common words — never treat as equipment IDs */
  var NOT_ID = {
    loco:1, locos:1, locomotives:1, caboose:1, cabooses:1, hopper:1, hoppers:1,
    winch:1, winches:1, winder:1, winders:1, fan:1, fans:1, pump:1, pumps:1,
    safe:1, safety:1, down:1, downtime:1, fault:1, faults:1, failure:1, failures:1,
    breakdown:1, breakdowns:1, brake:1, brakes:1, week:1, month:1, year:1, today:1,
    yesterday:1, highest:1, lowest:1, worst:1, best:1, top:1, bottom:1, list:1,
    most:1, least:1, reliable:1, availability:1, maintenance:1, overdue:1,
    antenna:1, antennas:1, issue:1, issues:1, problem:1, problems:1
  };

  var STEM = {
    brakes: 'brake', faults: 'fault', failures: 'failure', breakdowns: 'breakdown',
    locos: 'loco', locomotives: 'loco', hoppers: 'hopper', cabooses: 'caboose',
    issues: 'issue', problems: 'problem', reports: 'report', antennas: 'antenna',
    doors: 'door', switches: 'switch', motors: 'motor', hydraulics: 'hydraulic',
    electrics: 'electric', electrical: 'electric', mechanical: 'mechanic'
  };
  var SYNONYMS = {
    breakdown: ['failure', 'fault', 'down'],
    failure: ['fault', 'breakdown', 'down'],
    fault: ['failure', 'breakdown', 'issue', 'problem'],
    problem: ['issue', 'fault'],
    issue: ['problem', 'fault'],
    down: ['offline', 'failed', 'broken'],
    loco: ['locomotive'],
    locomotive: ['loco']
  };

  function stem(w) {
    w = String(w || '').toLowerCase();
    if (STEM[w]) return STEM[w];
    if (w.length > 4 && w.slice(-3) === 'ies') return w.slice(0, -3) + 'y';
    if (w.length > 3 && w.slice(-1) === 's' && w.slice(-2) !== 'ss') return w.slice(0, -1);
    return w;
  }

  function tokens(q) {
    return String(q || '').toLowerCase().replace(/[^\w\s\-./]/g, ' ').split(/\s+/).filter(function (w) {
      return w.length > 1 && !STOP[w];
    }).map(stem);
  }

  function expandTerms(words) {
    var set = {};
    words.forEach(function (w) {
      set[w] = 1;
      var syn = SYNONYMS[w];
      if (syn) syn.forEach(function (s) { set[s] = 1; });
    });
    return Object.keys(set);
  }

  /* ── Date range parsing (overrides dashboard period for event filters when present) ── */
  function parseDateRange(q) {
    var t = String(q || '').toLowerCase();
    var now = new Date();
    now.setHours(23, 59, 59, 999);
    var start = null, end = now, label = null;

    if (/\btoday\b/.test(t)) {
      start = new Date(now); start.setHours(0, 0, 0, 0);
      label = 'today';
    } else if (/\byesterday\b/.test(t)) {
      start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setHours(23, 59, 59, 999);
      label = 'yesterday';
    } else if (/\bthis\s+week\b|\blast\s+7\s+days?\b/.test(t)) {
      start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      label = 'this week';
    } else if (/\blast\s+week\b/.test(t)) {
      end = new Date(now); end.setDate(end.getDate() - ((end.getDay() + 6) % 7) - 1); end.setHours(23, 59, 59, 999);
      start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      label = 'last week';
    } else if (/\bthis\s+month\b|\blast\s+30\s+days?\b/.test(t)) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = 'this month';
    } else if (/\blast\s+month\b/.test(t)) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = 'last month';
    } else if (/\blast\s+(\d+)\s+days?\b/.test(t)) {
      var n = parseInt(RegExp.$1, 10);
      start = new Date(now); start.setDate(start.getDate() - (n - 1)); start.setHours(0, 0, 0, 0);
      label = 'last ' + n + ' days';
    } else if (/\bthis\s+year\b/.test(t)) {
      start = new Date(now.getFullYear(), 0, 1);
      label = 'this year';
    }
    if (!start) return null;
    return { start: start, end: end, label: label };
  }

  function inDateRange(u, range) {
    if (!range) return true;
    var d = u.date || u.eventDate || u.timestamp || '';
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return true; /* keep if unparseable rather than drop */
    return dt >= range.start && dt <= range.end;
  }

  function extractShaft(text) {
    var t = String(text || '');
    var m = t.match(/\b(\d{1,2}c?)\s*shaft\b/i) || t.match(/\bshaft\s*[#:]?\s*(\d{1,2}c?)\b/i);
    if (m) {
      var s = m[1];
      if (/c$/i.test(s)) return s.replace(/c$/i, 'C') + ' Shaft';
      return s + ' Shaft';
    }
    if (/\b(ef)\s*shaft\b/i.test(t)) return 'EF Shaft';
    if (/\bnorth\s*shaft\b/i.test(t)) return 'North Shaft';
    if (/\bsouth\s*shaft\b/i.test(t)) return 'South Shaft';
    var shafts = {};
    filteredEq().forEach(function (e) {
      var sh = String(e.shaft || '').trim();
      if (sh) shafts[sh.toLowerCase()] = sh;
    });
    var low = t.toLowerCase();
    for (var k in shafts) {
      if (low.indexOf(k) !== -1) return shafts[k];
      var bare = k.replace(/\s*shaft$/, '');
      if (bare && new RegExp('\\b' + bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(low))
        return shafts[k];
    }
    return null;
  }

  function extractType(text) {
    var map = [
      ['locomotive', 'Loco'], ['loco', 'Loco'], ['caboose', 'Caboose'], ['hopper', 'Hopper'],
      ['winder', 'Winder'], ['winch', 'Winch'], ['compressor', 'Compressor'], ['loader', 'Loader'],
      ['substation', 'Substation'], ['ventilation', 'Ventilation Fan'], ['fan', 'Ventilation Fan'],
      ['pump', 'Pump'], ['conveyor', 'Conveyor'], ['transformer', 'Transformer']
    ];
    var low = String(text || '').toLowerCase();
    for (var i = 0; i < map.length; i++) {
      if (new RegExp('\\b' + map[i][0] + 's?\\b').test(low)) return map[i][1];
    }
    return null;
  }

  /* Strict ID extraction — never treat type plurals as IDs; short tokens force clarify */
  function extractEquipToken(text) {
    var t = String(text || '');
    var m = t.match(/\b(?:loco|caboose|hopper|winch|winder|unit|equipment|eq|asset|machine)\s*[#:]?\s*([A-Za-z0-9\-_\/]+)\b/i);
    if (m) {
      var cand = m[1];
      var low = cand.toLowerCase();
      if (!NOT_ID[low] && !STOP[low] && !/^[a-z]+s$/i.test(cand)) return cand;
    }
    /* pure number only if 3+ digits; alnum mining IDs */
    m = t.match(/\b(\d{1,3}[A-Za-z]{1,8}\d{2,8}|\d{2,3}[A-Za-z]{1,6}\d{2,8}|[A-Za-z]{2,8}\d{3,10}|\d{3,10})\b/);
    if (m) {
      var c = m[1];
      if (!NOT_ID[c.toLowerCase()]) return c;
    }
    return null;
  }

  function findEquipMatches(token) {
    var n = normId(token);
    var dig = String(token).replace(/\D/g, '');
    var pool = filteredEq();
    var exact = [];
    var partial = [];
    pool.forEach(function (e) {
      var id = normId(e.id);
      if (id === n) exact.push(e);
      else if (dig.length >= 3 && (String(e.id) === dig || String(e.id).endsWith(dig) || id.endsWith(dig))) partial.push(e);
      else if (n.length >= 3 && id.indexOf(n) !== -1) partial.push(e);
    });
    if (exact.length) return exact;
    return partial;
  }

  function resolveEquip(token) {
    if (!token) return { status: 'none' };
    var hits = findEquipMatches(token);
    if (!hits.length) return { status: 'none', token: token };
    /* short pure-digit tokens always clarify even on a single hit (avoid "1" → silent pick) */
    var digitsOnly = /^\d+$/.test(String(token));
    if (hits.length === 1 && digitsOnly && String(token).length <= 2)
      return { status: 'ambiguous', token: token, options: hits };
    if (hits.length === 1) return { status: 'ok', equip: hits[0] };
    return { status: 'ambiguous', token: token, options: hits };
  }

  function clarifyEquip(token, options) {
    var rows = options.slice(0, 12).map(function (e) {
      return [esc(e.id), esc(e.shaft || '—'), esc(inferType(e))];
    });
    return interp(['ambiguous ID: ' + token], null) +
      'I found <strong>' + options.length + '</strong> match(es) for <strong>' + esc(token) + '</strong>. Which one did you mean?' +
      table(['ID', 'Shaft', 'Type'], rows, 12) +
      '<div class="meta">Reply with the full Equipment ID (e.g. ' + esc(options[0].id) + '). Short numbers are never auto-matched.</div>';
  }

  function riskScore(e) {
    var st = eqStatus(e.id) || {};
    var m = relMetrics(e.id) || {};
    var fails = Number(st.failures) || 0;
    var downtime = Number(st.downtime) || 0;
    var avail = st.availability != null ? Number(st.availability) : null;
    var health = m.health != null ? Number(m.health) : null;
    var score = fails * 12 + Math.min(40, downtime / 4);
    if (avail != null) score += Math.max(0, 100 - avail) * 0.55;
    if (health != null) score += Math.max(0, 100 - health) * 0.35;
    if (String(st.status || '').toLowerCase() === 'down') score += 25;
    return { score: score, fails: fails, downtime: downtime, avail: avail, health: health, status: st.status || '—', mtbfLabel: m.mtbfLabel, mttrLabel: m.mttrLabel };
  }

  function table(headers, rows, limit) {
    limit = limit || 20;
    if (!rows.length) return '<em>No matching rows.</em>';
    var html = '<table><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
    rows.slice(0, limit).forEach(function (row) {
      html += '<tr>' + row.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
    });
    html += '</table>';
    if (rows.length > limit) html += '<div class="meta">Showing ' + limit + ' of ' + rows.length + '</div>';
    return html;
  }

  function interp(parts, range) {
    var bits = (parts || []).filter(Boolean);
    if (range && range.label) bits.push(range.label);
    else bits.push(periodLabel());
    bits.push(filterChip());
    return '<div class="meta"><strong>Interpreted as:</strong> ' + bits.map(function (b) { return esc(b); }).join(' · ') + '</div>';
  }

  function matchShaft(eShaft, want) {
    if (!want) return true;
    var es = String(eShaft || '').toLowerCase();
    var sk = String(want).toLowerCase().replace(/\s*shaft$/, '').trim();
    return es === String(want).toLowerCase() || es.indexOf(sk) !== -1;
  }

  function matchType(e, want) {
    if (!want) return true;
    return String(inferType(e)).toLowerCase().indexOf(String(want).toLowerCase()) !== -1;
  }

  function eventBlob(u) {
    return [u.reason, u.notes, u.description, u.fault, u.actionTaken, u.comment, u.rootCause,
      u.operator, u.reportedBy, u.equipmentId, u.locoNumber, u.shaft, u.workplace]
      .map(function (x) { return String(x || '').toLowerCase(); }).join(' ');
  }

  function filterEvents(opts) {
    opts = opts || {};
    var list = opts.scopedOnly ? allScopedUp() : filteredUp();
    var words = opts.words || [];
    var terms = expandTerms(words);
    var shaft = opts.shaft;
    var range = opts.range;
    var failuresOnly = opts.failuresOnly;
    var scored = [];
    list.forEach(function (u) {
      if (failuresOnly && !isFail(u)) return;
      if (shaft && !matchShaft(u.shaft, shaft)) {
        var eq = filteredEq().find(function (e) { return normId(e.id) === normId(u.equipmentId || u.locoNumber); });
        if (!eq || !matchShaft(eq.shaft, shaft)) return;
      }
      if (range && !inDateRange(u, range)) return;
      var blob = eventBlob(u);
      var score = 0;
      if (terms.length) {
        terms.forEach(function (w) { if (blob.indexOf(w) !== -1) score += 1; });
        if (score === 0) return;
      }
      scored.push({ u: u, score: score });
    });
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String((b.u.date || '') + (b.u.time || '')).localeCompare(String((a.u.date || '') + (a.u.time || '')));
    });
    return scored;
  }

  /* ── Answer builders ── */
  function answerEquipProfile(eq, range, understood) {
    lastCtx.equipId = eq.id;
    lastCtx.topic = 'equipment';
    lastCtx.shaft = eq.shaft || lastCtx.shaft;
    var st = eqStatus(eq.id) || {};
    var rs = riskScore(eq);
    var ups = filterEvents({ words: [], range: range }).map(function (h) { return h.u; }).filter(function (u) {
      return normId(u.equipmentId || u.locoNumber) === normId(eq.id);
    });
    if (!ups.length) {
      ups = filteredUp().filter(function (u) { return normId(u.equipmentId || u.locoNumber) === normId(eq.id); })
        .sort(function (a, b) { return String((b.date || '')).localeCompare(String((a.date || ''))); });
    }
    var html = interp(understood, range) +
      '<strong>' + esc(eq.id) + '</strong> · ' + esc(eq.shaft || '—') + ' · ' + esc(inferType(eq)) +
      '<br>Workplace: ' + esc(eq.level || '—') + ' · Size: ' + esc(eq.locoSize || '—') +
      '<br>Status: <strong>' + esc(st.status || rs.status || '—') + '</strong>' +
      '<br>Availability: <strong>' + (rs.avail != null ? rs.avail.toFixed(1) + '%' : '—') + '</strong>' +
      ' · Failures (period metrics): <strong>' + rs.fails + '</strong> · Downtime: <strong>' + rs.downtime.toFixed(1) + ' h</strong>';
    if (rs.mtbfLabel) html += '<br>MTBF: ' + esc(rs.mtbfLabel) + ' · MTTR: ' + esc(rs.mttrLabel || '—');
    if (ups.length) {
      html += '<br><br><strong>Recent events</strong> (' + ups.length + ')';
      html += table(['Date', 'Status', 'Reporter', 'Reason'], ups.slice(0, 8).map(function (u) {
        return [esc(u.date || ''), esc(u.status || ''), esc(u.reportedBy || u.operator || '—'),
          esc(String(u.reason || u.notes || '').slice(0, 55))];
      }), 8);
    }
    return html;
  }

  function answerIsSafe(eq, range, understood) {
    lastCtx.equipId = eq.id;
    lastCtx.topic = 'safety';
    lastCtx.shaft = eq.shaft || lastCtx.shaft;
    var st = eqStatus(eq.id) || {};
    var rs = riskScore(eq);
    var entries = filterEvents({ failuresOnly: true, range: range }).map(function (h) { return h.u; })
      .filter(function (u) { return normId(u.equipmentId || u.locoNumber) === normId(eq.id); });
    if (!entries.length) {
      entries = allScopedUp().filter(function (u) {
        return normId(u.equipmentId || u.locoNumber) === normId(eq.id) && isFail(u);
      });
    }
    var failCount = Math.max(rs.fails, entries.length);
    var status = String(st.status || rs.status || '').toLowerCase();
    var verdict, colour, reasons = [];
    if (status === 'down') {
      verdict = 'Reliability flag: currently Down — review before use';
      colour = 'var(--danger)';
      reasons.push('Logged status is <strong>Down</strong>.');
    } else if (failCount >= 5) {
      verdict = 'Reliability flag: repeated failures — investigate before use';
      colour = 'var(--danger)';
      reasons.push('<strong>' + failCount + '</strong> failure / down events in the analysis window.');
    } else if (failCount >= 3) {
      verdict = 'Reliability flag: review before use';
      colour = 'var(--warning)';
      reasons.push('<strong>' + failCount + '</strong> failure events — possible recurring issue.');
    } else if (failCount >= 1) {
      verdict = 'Caution: at least one failure logged';
      colour = 'var(--warning)';
      reasons.push('<strong>' + failCount + '</strong> failure entry — check last fault and formal pre-use inspection.');
    } else if (status === 'up' && (rs.avail == null || rs.avail >= 90)) {
      verdict = 'No reliability flags in logged data';
      colour = 'var(--success)';
      reasons.push('Status Up and no failure events in the selected window.');
    } else {
      verdict = 'Limited signal — complete formal pre-use inspection';
      colour = 'var(--warning)';
      reasons.push('Not enough adverse flags to block, but logs are not a clearance.');
    }
    if (rs.avail != null && rs.avail < 70) {
      reasons.push('Availability only <strong>' + rs.avail.toFixed(1) + '%</strong> in period metrics.');
      colour = 'var(--danger)';
      verdict = 'Reliability flag: low availability — review before use';
    } else if (rs.avail != null) {
      reasons.push('Availability <strong>' + rs.avail.toFixed(1) + '%</strong>.');
    }
    var html = interp(understood, range) +
      '<strong style="color:' + colour + '">' + esc(verdict) + '</strong>' +
      '<div class="meta">Based on status logs only — <strong>not</strong> a formal pre-use clearance. Follow site checklist and procedures. Never treat this as “cleared to run”.</div>' +
      '<br><strong>' + esc(eq.id) + '</strong> · ' + esc(eq.shaft || '—') +
      '<br>Failures in view: <strong>' + failCount + '</strong> · Downtime metrics: <strong>' + rs.downtime.toFixed(1) + ' h</strong>';
    html += '<ul style="margin:0.4rem 0 0 1.1rem">' + reasons.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    if (entries.length) {
      html += table(['Date', 'Reporter', 'Reason'], entries.slice(0, 6).map(function (u) {
        return [esc(u.date || ''), esc(u.reportedBy || u.operator || '—'), esc(String(u.reason || '').slice(0, 60))];
      }), 6);
    }
    return html;
  }

  function answerDowntimeRank(highest, shaft, type, range, understood) {
    lastCtx.topic = 'downtime';
    lastCtx.shaft = shaft;
    var rows = filteredEq().filter(function (e) {
      return matchShaft(e.shaft, shaft) && matchType(e, type);
    }).map(function (e) {
      var rs = riskScore(e);
      return { id: e.id, shaft: e.shaft || '—', type: inferType(e), downtime: rs.downtime, fails: rs.fails, status: rs.status };
    });
    /* highest: only assets with downtime > 0; lowest: include zeros so true lowest is visible */
    if (highest) rows = rows.filter(function (r) { return r.downtime > 0; });
    rows.sort(function (a, b) {
      return highest ? (b.downtime - a.downtime) : (a.downtime - b.downtime);
    });
    if (!rows.length) return interp(understood, range) + 'No downtime figures in scope for that filter.';
    var title = highest ? 'Highest downtime' : 'Lowest downtime';
    var html = interp(understood, range) + '<strong>' + title + '</strong>';
    html += table(['#', 'ID', 'Shaft', 'Type', 'Downtime hrs', 'Fails'], rows.slice(0, 12).map(function (r, i) {
      return [String(i + 1), esc(r.id), esc(r.shaft), esc(r.type), r.downtime.toFixed(1), String(r.fails)];
    }), 12);
    html += '<div class="meta">Ranked by downtime only (period metrics from getEquipmentStatus · ' + esc(periodLabel()) + '). Not a reliability ranking.</div>';
    return html;
  }

  function answerFaultRank(shaft, type, range, words, understood, limit) {
    lastCtx.topic = 'faults';
    lastCtx.shaft = shaft;
    limit = limit || 10;
    var hits = filterEvents({ words: words, shaft: shaft, range: range, failuresOnly: !words.length });
    var byReason = {};
    hits.forEach(function (h) {
      var key = String(h.u.reason || h.u.notes || '(no reason)').trim().slice(0, 80) || '(no reason)';
      if (!byReason[key]) byReason[key] = { reason: key, n: 0, equip: {} };
      byReason[key].n++;
      var id = normId(h.u.equipmentId || h.u.locoNumber);
      if (id) byReason[key].equip[id] = 1;
    });
    var list = Object.keys(byReason).map(function (k) { return byReason[k]; });
    list.sort(function (a, b) { return b.n - a.n; });
    if (!list.length) {
      return interp(understood, range) + 'No matching fault / failure events for that filter.';
    }
    var html = interp(understood, range) + '<strong>Top fault reasons</strong> — ' + hits.length + ' event(s)';
    html += table(['Count', 'Reason', 'Assets'], list.slice(0, limit).map(function (r) {
      return [String(r.n), esc(r.reason), String(Object.keys(r.equip).length)];
    }), limit);
    html += table(['Date', 'Equipment', 'Reporter', 'Reason'], hits.slice(0, 12).map(function (h) {
      var u = h.u;
      return [esc(u.date || ''), esc(u.equipmentId || u.locoNumber || ''), esc(u.reportedBy || u.operator || '—'),
        esc(String(u.reason || '').slice(0, 55))];
    }), 12);
    return html;
  }

  function answerRank(best, shaft, type, range, understood) {
    lastCtx.topic = best ? 'reliable' : 'worst';
    lastCtx.shaft = shaft;
    var rows = filteredEq().filter(function (e) {
      return matchShaft(e.shaft, shaft) && matchType(e, type);
    }).map(function (e) {
      var rs = riskScore(e);
      return { id: e.id, shaft: e.shaft || '—', fails: rs.fails, avail: rs.avail, status: rs.status, score: rs.score };
    });
    rows.sort(function (a, b) {
      if (best) {
        var ad = String(a.status).toLowerCase() === 'down' ? 1 : 0;
        var bd = String(b.status).toLowerCase() === 'down' ? 1 : 0;
        if (ad !== bd) return ad - bd;
        if (a.fails !== b.fails) return a.fails - b.fails;
        return (b.avail != null ? b.avail : 50) - (a.avail != null ? a.avail : 50);
      }
      return b.score - a.score;
    });
    if (!rows.length) return interp(understood, range) + 'No equipment to rank in scope.';
    var html = interp(understood, range) + '<strong>' + (best ? 'Most reliable' : 'Worst-performing') + '</strong>';
    html += table(['#', 'ID', 'Shaft', 'Fails', 'Avail', 'Status'], rows.slice(0, 12).map(function (r, i) {
      return [String(i + 1), esc(r.id), esc(r.shaft), String(r.fails),
        r.avail != null ? r.avail.toFixed(1) + '%' : '—', esc(r.status)];
    }), 12);
    html += '<div class="meta">Uses period metrics from getEquipmentStatus / getReliabilityMetrics (' + esc(periodLabel()) + ').</div>';
    return html;
  }

  function answerShaftRank(range, understood) {
    lastCtx.topic = 'shaft';
    var by = {};
    filteredEq().forEach(function (e) {
      var s = e.shaft || 'Unassigned';
      if (!by[s]) by[s] = { shaft: s, n: 0, fails: 0, score: 0, downNow: 0, availSum: 0, availN: 0 };
      var b = by[s];
      var rs = riskScore(e);
      b.n++; b.fails += rs.fails; b.score += rs.score;
      if (rs.avail != null) { b.availSum += rs.avail; b.availN++; }
      if (String(rs.status).toLowerCase() === 'down') b.downNow++;
    });
    var list = Object.keys(by).map(function (k) {
      var b = by[k];
      b.avgAvail = b.availN ? b.availSum / b.availN : null;
      b.avgScore = b.n ? b.score / b.n : 0;
      return b;
    });
    list.sort(function (a, b) { return b.avgScore - a.avgScore || b.fails - a.fails; });
    var html = interp(understood, range) + '<strong>Shaft performance</strong>';
    html += table(['Shaft', 'Assets', 'Fails', 'Avg avail', 'Down now'], list.map(function (b) {
      return [esc(b.shaft), String(b.n), String(b.fails),
        b.avgAvail != null ? b.avgAvail.toFixed(1) + '%' : '—', String(b.downNow)];
    }));
    if (list.length) html += '<br><strong>Highest risk in this view:</strong> ' + esc(list[0].shaft);
    html += '<div class="meta">Rankings use period metrics from getEquipmentStatus / getReliabilityMetrics.</div>';
    return html;
  }

  function answerNoBreakdowns(shaft, type, range, understood) {
    lastCtx.topic = 'no-breakdowns';
    var failed = {};
    allScopedUp().forEach(function (u) {
      if (isFail(u) && (!range || inDateRange(u, range))) failed[normId(u.equipmentId || u.locoNumber)] = 1;
    });
    var clean = filteredEq().filter(function (e) {
      if (!matchShaft(e.shaft, shaft) || !matchType(e, type)) return false;
      var st = eqStatus(e.id) || {};
      if ((Number(st.failures) || 0) > 0) return false;
      if (failed[normId(e.id)]) return false;
      return true;
    });
    if (!clean.length) return interp(understood, range) + 'Every asset in scope has at least one failure/down entry in the window (isFailureEvent-aligned).';
    var html = interp(understood, range) + '<strong>No breakdown / failure entries</strong> — ' + clean.length + ' asset(s)';
    html += table(['ID', 'Shaft', 'Type', 'Status'], clean.slice(0, 25).map(function (e) {
      var st = eqStatus(e.id) || {};
      return [esc(e.id), esc(e.shaft || '—'), esc(inferType(e)), esc(st.status || '—')];
    }), 25);
    html += '<div class="meta">Uses isFailureEvent consistently with the dashboard.</div>';
    return html;
  }

  function answerReplacement(shaft, type, range, understood) {
    lastCtx.topic = 'replacement';
    var pk = periodKey();
    var failThresh = pk === 'daily' ? 2 : (pk === 'weekly' ? 4 : 6);
    var downThresh = pk === 'daily' ? 12 : (pk === 'weekly' ? 72 : 120);
    var rows = filteredEq().filter(function (e) {
      if (!matchShaft(e.shaft, shaft) || !matchType(e, type)) return false;
      var rs = riskScore(e);
      return rs.fails >= failThresh || (rs.avail != null && rs.avail < 70) || (rs.health != null && rs.health < 45) || rs.downtime >= downThresh;
    }).map(function (e) {
      var rs = riskScore(e);
      return { id: e.id, shaft: e.shaft || '—', fails: rs.fails, avail: rs.avail, downtime: rs.downtime, score: rs.score };
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    if (!rows.length) {
      return interp(understood, range) + 'No assets meet replacement-review flags for this period ' +
        '(≥' + failThresh + ' failures, avail &lt;70%, or ≥' + downThresh + ' h downtime — scaled to ' + esc(periodLabel()) + ').';
    }
    var html = interp(understood, range) +
      '<strong>Replacement / overhaul candidates</strong>' +
      '<div class="meta">Heuristic for ' + esc(periodLabel()) + ' (≥' + failThresh + ' fails / &lt;70% avail / ≥' + downThresh + ' h). Confirm with engineering — not an automatic write-off list.</div>';
    html += table(['ID', 'Shaft', 'Fails', 'Avail', 'Down hrs'], rows.slice(0, 15).map(function (r) {
      return [esc(r.id), esc(r.shaft), String(r.fails), r.avail != null ? r.avail.toFixed(1) : '—', r.downtime.toFixed(0)];
    }), 15);
    return html;
  }

  function resolveMaintDue(m) {
    var due = m.due || m.nextDue || m.dueDate || '';
    if (due) return String(due).slice(0, 10);
    var last = m.lastDone || m.lastService || m.completedDate || m.lastDate;
    var interval = m.interval || m.frequency || m.pmInterval || 'monthly';
    if (last) {
      var derived = nextDue(last, interval);
      if (derived) return String(derived).slice(0, 10);
    }
    return '';
  }

  function answerMaintenance(q, shaft, range, understood) {
    lastCtx.topic = 'maintenance';
    lastCtx.shaft = shaft;
    var list = filteredMt();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var overdue = [], soon = [], all = [];
    list.forEach(function (m) {
      if (shaft) {
        var ms = String(m.shaft || '').toLowerCase();
        if (!ms) {
          var eqHit = findEquipMatches(m.equipment || m.equipmentId || '');
          ms = eqHit[0] ? String(eqHit[0].shaft || '').toLowerCase() : '';
        }
        if (ms && !matchShaft(ms, shaft)) return;
      }
      var dueStr = resolveMaintDue(m);
      var days = null;
      if (dueStr) {
        var d = new Date(dueStr);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          days = Math.ceil((d - today) / 86400000);
        }
      }
      var row = { id: m.equipment || m.equipmentId || '—', task: m.task || m.description || '—', due: dueStr || '—', days: days };
      all.push(row);
      if (days != null && days < 0) overdue.push(row);
      else if (days != null && days <= 14) soon.push(row);
    });
    overdue.sort(function (a, b) { return (a.days || 0) - (b.days || 0); });
    var wantOverdue = /\boverdue\b/i.test(q);
    if (wantOverdue || overdue.length) {
      var html = interp(understood, range) + '<strong>Overdue maintenance</strong> — ' + overdue.length;
      if (overdue.length) {
        html += table(['Equipment', 'Task', 'Due', 'Days'], overdue.slice(0, 15).map(function (r) {
          return [esc(r.id), esc(r.task), esc(r.due), '<span style="color:var(--danger)">' + r.days + '</span>'];
        }), 15);
      } else html += '<br>None overdue in scope.';
      if (soon.length) html += '<div class="meta">Also due within 14 days: ' + soon.length + '</div>';
      html += '<div class="meta">Due dates use due/nextDue/dueDate, or calculateNextDue(lastDone, interval) when only last service is known.</div>';
      return html;
    }
    var html2 = interp(understood, range) + '<strong>Maintenance tasks</strong> — ' + all.length +
      ' (overdue ' + overdue.length + ', due ≤14d ' + soon.length + ')';
    html2 += table(['Equipment', 'Task', 'Due', 'Days left'], all.slice(0, 20).map(function (r) {
      return [esc(r.id), esc(r.task), esc(r.due), r.days != null ? String(r.days) : '—'];
    }), 20);
    return html2;
  }

  function answerWhoReported(words, shaft, range, understood) {
    lastCtx.topic = 'reporter';
    var hits = filterEvents({ words: words, shaft: shaft, range: range, failuresOnly: false });
    if (!hits.length) hits = filterEvents({ words: words, shaft: shaft, range: range, failuresOnly: true });
    if (!hits.length) return interp(understood, range) + 'No status events matched that search.';
    var html = interp(understood, range) + '<strong>Who reported</strong> — ' + hits.length + ' event(s)';
    html += table(['Date', 'Equipment', 'Reporter', 'Status', 'Reason'], hits.slice(0, 20).map(function (h) {
      var u = h.u;
      return [esc(u.date || ''), esc(u.equipmentId || u.locoNumber || ''),
        esc(u.reportedBy || u.operator || '—'), esc(u.status || ''),
        esc(String(u.reason || u.notes || '').slice(0, 50))];
    }), 20);
    return html;
  }

  function answerCounts(words, shaft, type, range, failuresOnly, understood) {
    lastCtx.topic = 'count';
    lastCtx.shaft = shaft;
    var eqList = filteredEq().filter(function (e) {
      return matchShaft(e.shaft, shaft) && matchType(e, type);
    });
    var downN = eqList.filter(function (e) {
      var st = eqStatus(e.id) || {};
      return String(st.status || '').toLowerCase() === 'down';
    }).length;
    var ev = filterEvents({ words: words, shaft: shaft, range: range, failuresOnly: failuresOnly || !!words.length });
    if (!words.length && failuresOnly) {
      ev = filterEvents({ words: [], shaft: shaft, range: range, failuresOnly: true });
    }
    var scopeBits = [];
    if (shaft) scopeBits.push(shaft);
    if (type) scopeBits.push(type);
    if (words.length) scopeBits.push(words.join(' '));
    var html = interp(understood, range) + '<strong>Counts</strong>';
    html += '<br>Equipment matching filters: <strong>' + eqList.length + '</strong>';
    html += '<br>Currently Down: <strong>' + downN + '</strong>';
    html += '<br>Matching events' + (failuresOnly || words.length ? ' (faults/failures)' : '') + ': <strong>' + ev.length + '</strong>';
    if (scopeBits.length) html += '<div class="meta">Event scope: ' + esc(scopeBits.join(' · ')) + '</div>';
    if (ev.length && (words.length || failuresOnly)) {
      html += table(['Date', 'Equipment', 'Reporter', 'Reason'], ev.slice(0, 10).map(function (h) {
        var u = h.u;
        return [esc(u.date || ''), esc(u.equipmentId || ''), esc(u.reportedBy || u.operator || '—'),
          esc(String(u.reason || '').slice(0, 55))];
      }), 10);
    }
    return html;
  }

  function answerList(shaft, type, wantDown, wantUp, range, understood) {
    lastCtx.topic = 'list';
    lastCtx.shaft = shaft;
    lastCtx.type = type;
    var rows = filteredEq().filter(function (e) {
      if (!matchShaft(e.shaft, shaft) || !matchType(e, type)) return false;
      var st = eqStatus(e.id) || {};
      var s = String(st.status || '').toLowerCase();
      if (wantDown && s !== 'down') return false;
      if (wantUp && s !== 'up') return false;
      return true;
    }).map(function (e) {
      var rs = riskScore(e);
      return { id: e.id, shaft: e.shaft || '—', type: inferType(e), status: rs.status, fails: rs.fails, avail: rs.avail };
    });
    rows.sort(function (a, b) { return b.fails - a.fails || String(a.id).localeCompare(String(b.id)); });
    if (!rows.length) return interp(understood, range) + 'No equipment matched those filters.';
    var title = wantDown ? 'Down equipment' : (type ? type + ' list' : 'Equipment list');
    var html = interp(understood, range) + '<strong>' + esc(title) + '</strong> — ' + rows.length + ' asset(s)';
    html += table(['ID', 'Shaft', 'Type', 'Status', 'Fails', 'Avail'], rows.map(function (r) {
      return [esc(r.id), esc(r.shaft), esc(r.type), esc(r.status), String(r.fails),
        r.avail != null ? r.avail.toFixed(1) + '%' : '—'];
    }), 25);
    return html;
  }

  function answerAvailSummary(eqList, range, understood) {
    eqList = eqList || filteredEq();
    var withA = 0, sum = 0, down = 0, up = 0;
    eqList.forEach(function (e) {
      var rs = riskScore(e);
      if (rs.avail != null) { withA++; sum += rs.avail; }
      if (String(rs.status).toLowerCase() === 'down') down++;
      else if (String(rs.status).toLowerCase() === 'up') up++;
    });
    return interp(understood, range) + '<strong>Fleet snapshot</strong>' +
      '<br>Assets: <strong>' + eqList.length + '</strong> · Avg availability: <strong>' +
      (withA ? (sum / withA).toFixed(1) + '%' : '—') + '</strong>' +
      '<br>Up: <strong>' + up + '</strong> · Down: <strong>' + down + '</strong>';
  }

  function answerMtbf(shaft, type, range, understood) {
    var rows = [];
    filteredEq().forEach(function (e) {
      if (!matchShaft(e.shaft, shaft) || !matchType(e, type)) return;
      var m = relMetrics(e.id) || {};
      var st = eqStatus(e.id) || {};
      if (m.mtbf != null || m.mtbfLabel) {
        rows.push({ id: e.id, shaft: e.shaft || '—', label: m.mtbfLabel || '—', mttr: m.mttrLabel || '—', mtbf: m.mtbf, fails: st.failures || 0 });
      }
    });
    rows.sort(function (a, b) { return (a.mtbf != null ? a.mtbf : 1e9) - (b.mtbf != null ? b.mtbf : 1e9); });
    if (!rows.length) return interp(understood, range) + 'Insufficient data for MTBF in the current period.';
    var html = interp(understood, range) + '<strong>MTBF (lowest first)</strong>';
    html += table(['ID', 'Shaft', 'MTBF', 'MTTR', 'Fails'], rows.slice(0, 12).map(function (r) {
      return [esc(r.id), esc(r.shaft), esc(r.label), esc(r.mttr), String(r.fails)];
    }), 12);
    html += '<div class="meta">From getReliabilityMetrics for ' + esc(periodLabel()) + '.</div>';
    return html;
  }

  /* ── Main router — intent priority: specific before generic ── */
  function searchEverything(q) {
    var raw = String(q || '').trim();
    var t = raw.toLowerCase();
    var range = parseDateRange(raw);
    var shaft = extractShaft(raw) || (/\b(same|that)\s+shaft\b/.test(t) ? lastCtx.shaft : null) || null;
    var type = extractType(raw);
    var equipToken = extractEquipToken(raw);
    /* follow-up: "and its MTBF?" / "what about it?" */
    if (!equipToken && lastCtx.equipId && (/\b(its|it|that|this|same)\b/.test(t) || /^(and|also)\b/.test(t))) {
      equipToken = lastCtx.equipId;
    }
    if (!shaft && lastCtx.shaft && /\b(there|same|that shaft)\b/.test(t)) shaft = lastCtx.shaft;

    var words = tokens(raw).filter(function (w) {
      if (shaft && shaft.toLowerCase().indexOf(w) !== -1) return false;
      if (type && type.toLowerCase().indexOf(w) !== -1) return false;
      if (equipToken && String(equipToken).toLowerCase().indexOf(w) !== -1) return false;
      if (/^(today|yesterday|week|month|year|last|days?|this)$/.test(w)) return false;
      /* drop ranking / intent words from keyword bag */
      if (/^(highest|lowest|worst|best|top|bottom|most|least|reliable|downtime|safe|safety|overdue|maint|maintenance|count|number)$/.test(w)) return false;
      return true;
    });

    var wantDown = /\b(down|offline|broken)\b/i.test(t);
    var wantUp = (/\bup\b/.test(t) || /\boperational\b/.test(t)) && !wantDown;
    var wantFail = /\b(fail|fault|breakdown|incident)s?\b/i.test(t);
    var wantMaint = /\b(maint|pm\b|service|overdue|schedule)\b/i.test(t);
    var wantCount = /\b(how many|count|number of|total)\b/i.test(t);
    var wantList = /\b(list|show|which|what are|display)\b/i.test(t);
    var wantDowntime = /\b(downtime|down time)\b/i.test(t);
    var wantHighest = /\b(highest|most|max|maximum|longest|top)\b/i.test(t);
    var wantLowest = /\b(lowest|least|min|minimum|shortest|bottom)\b/i.test(t);
    var wantWorst = /\b(worst|bad|poor|underperform|problematic)\b/i.test(t);
    var wantBest = /\b(best|most reliable|healthiest)\b/i.test(t) || (/\breliable\b/.test(t) && !/\bunreliable\b/.test(t) && !wantWorst);
    var wantSafe = /\b(safe|safety|fit to use|ok to use|can i use|serviceable|roadworthy)\b/i.test(t);
    var wantReplace = /\b(replac|scrap|write.?off|retire|overhaul)\b/i.test(t);
    var wantNoBreak = /\b(no breakdown|no failure|no fault|without breakdown|never failed|zero failure|no report)\b/i.test(t);
    var wantAvail = /\b(availab)/i.test(t);
    var wantMtbf = /\b(mtbf|mttr|mean time)\b/i.test(t);
    var wantWho = /\b(who reported|reported by|reporter|operator)\b/i.test(t);
    var wantShaftPerf = /\bshafts?\b/.test(t) && (wantWorst || wantBest || /\b(perform|rank|compar)\b/.test(t));
    var topN = null;
    var topM = t.match(/\btop\s+(\d+)\b/);
    if (topM) topN = Math.min(20, Math.max(1, parseInt(topM[1], 10)));

    var understood = [];
    if (equipToken) understood.push('equipment ' + equipToken);
    if (shaft) understood.push(shaft);
    if (type) understood.push(type);
    if (words.length) understood.push(words.join(' '));
    if (wantFail) understood.push('faults/failures');
    if (wantDowntime) understood.push(wantLowest ? 'lowest downtime' : 'highest downtime');
    if (wantMaint) understood.push(/overdue/i.test(t) ? 'overdue maintenance' : 'maintenance');
    if (wantSafe) understood.push('safety advisory');
    if (wantWho) understood.push('reporters');
    if (wantCount) understood.push('counts');
    if (wantNoBreak) understood.push('no breakdowns');
    if (wantReplace) understood.push('replacement review');
    if (wantShaftPerf) understood.push('shaft performance');
    if (wantBest && !wantDowntime) understood.push('most reliable');
    if (wantWorst && !wantShaftPerf && !wantDowntime) understood.push('worst performing');

    /* Equipment resolution */
    if (equipToken) {
      var res = resolveEquip(equipToken);
      if (res.status === 'ambiguous') return clarifyEquip(equipToken, res.options);
      if (res.status === 'none') {
        return interp(understood, range) +
          'No equipment matching <strong>' + esc(equipToken) + '</strong> in your current shaft/type scope (' + esc(filterChip()) + ').';
      }
      if (wantSafe) return answerIsSafe(res.equip, range, understood);
      if (wantMtbf) {
        lastCtx.equipId = res.equip.id;
        var m = relMetrics(res.equip.id) || {};
        return interp(understood, range) + '<strong>' + esc(res.equip.id) + '</strong><br>MTBF: <strong>' +
          esc(m.mtbfLabel || '—') + '</strong> · MTTR: <strong>' + esc(m.mttrLabel || '—') + '</strong>' +
          '<div class="meta">From getReliabilityMetrics · ' + esc(periodLabel()) + '</div>';
      }
      return answerEquipProfile(res.equip, range, understood);
    }

    /* Priority order — specific metrics BEFORE generic best/worst */
    if (wantWho) return answerWhoReported(words, shaft, range, understood);
    if (wantNoBreak) return answerNoBreakdowns(shaft, type, range, understood);
    if (wantReplace) return answerReplacement(shaft, type, range, understood);
    if (wantMaint) return answerMaintenance(raw, shaft, range, understood);
    if (wantDowntime) return answerDowntimeRank(!wantLowest, shaft, type, range, understood);
    if (wantMtbf) return answerMtbf(shaft, type, range, understood);
    if (wantShaftPerf) return answerShaftRank(range, understood);

    /* Fault / failure search & top faults — before generic rankings */
    if (wantFail || (words.length && !wantCount && !wantList && !wantBest && !wantWorst && !wantAvail)) {
      if (/\btop\b|\bmost common\b|\bcommon(est)?\b/i.test(t) || wantFail) {
        return answerFaultRank(shaft, type, range, words, understood, topN || 10);
      }
    }

    if (wantCount) {
      return answerCounts(words, shaft, type, range, wantFail || words.length > 0, understood);
    }

    /* Rankings only if not downtime/faults */
    if (wantWorst) return answerRank(false, shaft, type, range, understood);
    if (wantBest) return answerRank(true, shaft, type, range, understood);

    if (wantList || wantDown || wantUp || (type && !words.length) || (shaft && !words.length && !wantAvail)) {
      return answerList(shaft, type, wantDown, wantUp, range, understood);
    }

    if (wantAvail) return answerAvailSummary(filteredEq().filter(function (e) {
      return matchShaft(e.shaft, shaft) && matchType(e, type);
    }), range, understood);

    /* Keyword search in events */
    if (words.length) {
      var hits = filterEvents({ words: words, shaft: shaft, range: range, failuresOnly: false });
      if (hits.length) {
        var html = interp(understood, range) + '<strong>Matches in status history</strong> — ' + hits.length + ' event(s)';
        html += table(['Date', 'Equipment', 'Reporter', 'Status', 'Reason'], hits.slice(0, 15).map(function (h) {
          var u = h.u;
          return [esc(u.date || ''), esc(u.equipmentId || u.locoNumber || ''),
            esc(u.reportedBy || u.operator || '—'), esc(u.status || ''),
            esc(String(u.reason || u.notes || '').slice(0, 50))];
        }), 15);
        return html;
      }
      var eqHits = filteredEq().filter(function (e) {
        if (!matchShaft(e.shaft, shaft) || !matchType(e, type)) return false;
        var blob = [e.id, e.shaft, e.level, e.section, e.oem, inferType(e)].join(' ').toLowerCase();
        return words.some(function (w) { return blob.indexOf(w) !== -1; });
      });
      if (eqHits.length) {
        return interp(understood, range) + '<strong>Equipment matches</strong> — ' + eqHits.length +
          table(['ID', 'Shaft', 'Type', 'Workplace'], eqHits.slice(0, 20).map(function (e) {
            return [esc(e.id), esc(e.shaft || '—'), esc(inferType(e)), esc(e.level || '—')];
          }), 20);
      }
      return interp(understood, range) + 'No matches for those terms in scoped equipment or status history.';
    }

    return answerAvailSummary(filteredEq(), range, understood.length ? understood : ['fleet snapshot']);
  }

  function route(q) {
    if (/\b(help|what can|examples|how to ask)\b/i.test(q)) {
      return '<strong>Ask freely</strong> — every answer shows <em>Interpreted as: …</em> so you can see what was understood.<br><br>' +
        '• Equipment: <em>status of 511</em> · <em>is loco 16L10T026 safe?</em><br>' +
        '• Faults: <em>brake faults on 11 shaft this week</em> · <em>who reported antenna issues</em><br>' +
        '• Performance: <em>highest downtime</em> · <em>worst equipment</em> · <em>which shaft is worst</em><br>' +
        '• Counts: <em>how many brake faults on 11 shaft</em> · <em>list down locos</em><br>' +
        '• Maintenance: <em>overdue PM</em><br>' +
        '• Follow-ups: after an asset answer, ask <em>and its MTBF?</em><br>' +
        '<div class="meta">Uses live shaft-scoped data. Safety answers are advisory only — never “cleared to run”.</div>';
    }
    if (!api()) return 'Live data API is not linked yet. Sign in, wait for the app to load, then open Ask RBE again.';
    if (!dataReady()) {
      startWelcomePoll();
      return 'No equipment or status records in memory yet. Stay signed in until the dashboard finishes loading, then ask again. ' +
        '<div class="meta">Tip: open Dashboard once so KPIs populate. Welcome counts refresh when data arrives.</div>';
    }
    try {
      return searchEverything(q);
    } catch (err) {
      console.error(err);
      return 'Could not answer that. Try an Equipment ID, shaft name, or fault keyword.';
    }
  }

  function send() {
    var q = (input.value || '').trim();
    if (!q) return;
    input.value = '';
    addMsg(esc(q), 'user');
    if (sendBtn) sendBtn.disabled = true;
    showTyping();
    setTimeout(function () {
      removeTyping();
      var reply;
      try { reply = route(q); }
      catch (err) {
        console.error(err);
        reply = 'Something went wrong. Wait for data to load, then try again.';
      }
      addMsg(reply, 'bot');
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
      try {
        var r = api();
        if (r && r.logAudit) r.logAudit('chat_query', q.slice(0, 200), extractEquipToken(q) || lastCtx.equipId || '');
      } catch (e) {}
    }, 140);
  }

  window.openAskRBE = openChat;
  window.closeAskRBE = closeChat;
})();
</script>
