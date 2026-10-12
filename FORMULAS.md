# RBE Monitor – Corrected Calculation Engine (Documented Formulas)

All formulas below are **statistically gated**. Invented defaults (e.g. MTBF = 720 h) are forbidden. When gates are not met the UI must display “Insufficient data” and must not fabricate a number.

## 1. Operating Windows

Supported windows (user-selectable or default 30-day):
- Last 7 calendar days
- Last 30 calendar days
- Last 90 calendar days
- Custom range (must be ≥ 7 days for availability)

**Operating calendar** (preferred long-term): shift roster or planned operating hours per asset. Until roster data is available, calendar-time availability is used with explicit labelling.

## 2. Availability

### Calendar-time Availability (current implementation target)

\[
\text{Availability} = \left(1 - \frac{\sum \text{durationHours of qualifying downtime events in window}}{\text{windowHours}}\right) \times 100
\]

- Qualifying downtime = events with `statusCode ∈ {Down, Restricted}` that are **not** marked `OutOfService` / intentional standby / planned maintenance.
- `durationHours` is always calculated from `endAt − startAt`. Open events use `now − startAt` (capped).
- Single event duration is capped at `MAX_EVENT_HOURS` (default 72). Excess is flagged as outlier and excluded from KPI until reviewed.
- Window with zero observation of the asset → “Insufficient data”.

### Operating-time Availability (future)

Replace `windowHours` with sum of planned operating hours from the roster for the same window.

## 3. Failure Event Definition

A **failure event** is counted only when:
1. There is a transition into `statusCode = Down` (or equivalent failure mode), **and**
2. The event is later closed with a `resolutionCode` that is not `NoFaultFound` / `Cancelled` (configurable), **and**
3. The event survives hard de-duplication.

Status observations, logistics delays, and pure Restricted states without failure mode do **not** count as failures.

## 4. MTBF (Mean Time Between Failures)

\[
\text{MTBF} = \frac{\text{Total operating hours in observation period}}{\text{Number of failure events}}
\]

**Gate:** ≥ 3 failure events **and** observation period ≥ 30 days (720 h).  
Otherwise return `null` → UI shows “Insufficient data”.

Operating hours ≈ (end of period − start of period) − downtime hours (or from meter readings when available).

## 5. MTTR (Mean Time To Repair)

\[
\text{MTTR} = \frac{\sum \text{durationHours of closed failure events}}{\text{Number of closed failure events}}
\]

**Gate:** ≥ 3 closed failure events with valid `startAt`/`endAt`.  
Otherwise “Insufficient data”.

## 6. Event-Based Risk / Health Score (not predictive)

This is an **explanatory, event-log derived score**, not a calibrated health index and not RUL.

Heuristic (documented, transparent):

```
base = 100
base -= (100 − availability) × 0.45
base -= min(35, failureCount × 6)
base -= min(20, totalDowntimeHours / 10)
base -= anomalyComponent × 0.15
health = clamp(round(base), 5, 100)
```

Anomaly component is derived from failure frequency, availability bands, downtime volume, and recurrence of the same failure-mode code.

**Labelling requirement:** Always display as “Event-based risk score (log-derived)” with the data window and confidence (High / Medium / Low based on event count).

## 7. RUL / Predictive Claims

**Removed.** Until a calibrated model (Weibull, survival analysis, or OEM digital twin) exists and is validated against historical outcomes, no RUL number or “predictive” language is shown.

UI text: “Remaining Useful Life — Not available (model not calibrated)”.

## 8. Data-Quality Metrics (visible on every executive & reliability view)

- **Completeness %** = events with both startAt and endAt (or explicit open flag) / total events
- **Lag (hours)** = median (now − last event timestamp) per asset or fleet
- **Outlier rate %** = events with duration > MAX_EVENT_HOURS or < 0.05 h / total
- **Unclassified failure-mode %**
- **Observation coverage** = assets with ≥ N days of history / total assets in scope

These appear as a persistent bar or KPI row on Dashboard and Reliability Center.

## 9. Implementation Notes (Client)

- All calculations run only on filtered, de-duplicated, validated events.
- Results are cached and invalidated on new status writes.
- Full multi-year / multi-site scale requires server-side aggregation and materialised views (see ROADMAP).

---
*Formulas are the single source of truth. Any future change must update this document and the versioned calculation module simultaneously.*
