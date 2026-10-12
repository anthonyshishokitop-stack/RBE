# RBE Monitor Enterprise – Phased Remediation Roadmap

**Target:** Production-grade asset reliability platform for a multi-billion-rand mining company.  
**Principle:** Gate every capability by data density and architectural readiness. No invented metrics.

## Phase 0 – Immediate Stabilisation (This Release) ✅

**Goal:** Stop producing misleading numbers and remove non-existent predictive claims.

Deliverables:
- [x] Structured status + resolution codes (UI + logic).
- [x] Availability calculated against fixed windows (7/30/90 d) with start/end awareness.
- [x] MTBF / MTTR gated; “Insufficient data” when density too low.
- [x] RUL and “predictive” language removed or labelled “Not available”.
- [x] Data-quality metrics surface on Dashboard & Reliability Center.
- [x] Import validation (max duration, zero-duration rejection, de-dupe).
- [x] Honest UI labelling and executive confidence indicators.
- [x] Updated data model, formulas, and this roadmap documented.
- [x] Client-side audit logging strengthened.

**Test evidence (to be executed by QA):**
1. Import a file containing a 384 h downtime → must be flagged / capped / quarantined.
2. Asset with < 3 failures → MTBF/MTTR show “Insufficient data”.
3. Free-text “FIXED” must **not** change statusCode; only explicit Close action does.
4. Data-quality bar visible on every executive view.
5. No “RUL” or “predictive maintenance” claims in UI or meta description.

## Phase 1 – Backend Service Layer & Server-Side Enforcement (4–8 weeks)

**Goal:** Move writes of status, maintenance, critical configuration and audit behind an API / Cloud Functions.

- Cloud Functions (or Cloud Run) for all status open/close, criticality changes, imports.
- Firestore Security Rules hardened; client can no longer write arbitrary status or audit documents.
- Append-only audit written by service account.
- Materialised reliability metrics collection (recompute on event, not on page load).
- Server-side data scoping by shaft / role.

**Exit criteria:** Penetration test confirms client cannot bypass RBAC or invent metrics.

## Phase 2 – Event Store & Time-Series (8–12 weeks)

- Proper startAt / endAt model fully populated (migration of historical “hours-only” records).
- Time-series or event-store for high-volume status history.
- Operating calendar / shift roster integration for true operating-time availability.
- Cached, versioned report definitions for board packs.

## Phase 3 – Integration & Alerting (parallel / after Phase 1)

- Email / Teams / WhatsApp alerting with acknowledgement and escalation.
- CMMS / ERP bi-directional sync (work orders ↔ downtime events).
- Configurable thresholds (availability drop, repeat failure mode, overdue critical PM).

## Phase 4 – Calibrated Reliability & Condition Models (once data volume exists)

- Parametric MTBF / Weibull once ≥ 5–10 failures and multi-year history.
- Condition-based indicators (vibration, oil, runtime) separate from pure event-log scores.
- Only then introduce RUL with confidence intervals and model versioning.

## Phase 5 – Multi-Site Scale & Governance

- Hierarchical sites / shafts / fleets.
- Persistent shareable filter sets.
- Full data-residency, encryption-at-rest statements matching actual infrastructure.
- Formal data-ownership and change-control process operational.

---

**Support & Ownership Model** – see SUPPORT_MODEL.md.  
**Current code base remains a single-page Firebase app.** Phase 0 is the ready-to-run remediation delivered with this package. Subsequent phases require backend engineering capacity.
