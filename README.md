# RBE Monitor Enterprise – Phase 0 Production Remediation Package

**Ready-to-run** single-page application updated for a multi-billion-rand mining company.

## Contents

| File | Purpose |
|------|---------|
| `index.html` | Complete updated application (Firebase SPA). Drop in place of the previous file. |
| `DATA_MODEL.md` | Target data model, structured codes, validation rules, density gates. |
| `FORMULAS.md` | Documented, gated calculation formulas (availability, MTBF, MTTR, event-risk). |
| `ROADMAP.md` | Phased remediation roadmap with exit criteria. |
| `SUPPORT_MODEL.md` | Data ownership, change control, support tiers. |
| `README.md` | This file. |

## What was fixed in this release (Phase 0)

1. **Availability** – Calculated against a fixed 30-day window; “Insufficient data” when observation is too thin. Extreme single-event durations capped at 72 h.
2. **Status model** – Structured codes (`Down`, `Restricted`, `Up`, `Standby`, `OutOfService`, `UnderInvestigation`). Free-text is comment only and never overrides status.
3. **MTBF / MTTR** – Only shown when ≥ 3 failures **and** ≥ 30 days observation; otherwise “Insufficient data”. No invented 720 h default.
4. **RUL / “predictive” claims** – Removed. UI now states “Not available (model not calibrated)”.
5. **Event-based risk score** – Transparent heuristic, clearly labelled, gated by data density.
6. **Data-quality strip** – Completeness, outlier rate, unclassified %, lag visible on the executive dashboard.
7. **Import validation** – Rejects zero-hour “failures” and events > 72 h (quarantined). Writes `statusCode` and `startAt` where possible.
8. **Honest labelling** – Meta description, roadmap text, KPI titles, export headers, and alerts updated.

## How to run

1. Replace your existing `index.html` with the file in this package.
2. Ensure your Firebase project credentials / config already present in the file (or inject them) remain valid.
3. Serve over HTTPS (or local static server). The app is a pure client-side SPA.

```bash
# Example local serve
npx serve .
# or python -m http.server 8080
```

Open the URL, sign in with an existing Firebase Auth user that has a matching `users/{uid}` profile (role + allowedShafts).

## What still requires backend work (Phases 1+)

- True **server-side** RBAC and append-only audit (Cloud Functions / Cloud Run).
- Event-store / materialised metrics for multi-year, multi-site scale.
- Operating calendar / shift roster for operating-time availability.
- Calibrated RUL / survival models (only after sufficient history).
- Multi-channel alerting with escalation.

See `ROADMAP.md` for the full sequence and exit criteria.

## Test evidence checklist (Phase 0)

- [ ] Import a row with 384 h downtime → rejected / quarantined.
- [ ] Asset with < 3 failures → MTBF/MTTR = “Insufficient data”.
- [ ] Free-text containing “FIXED” does **not** change structured status.
- [ ] Data-quality bar visible on Dashboard.
- [ ] No “RUL” or “predictive maintenance” claims in primary KPI language.

## Support

Refer to `SUPPORT_MODEL.md` for ownership and escalation paths.
