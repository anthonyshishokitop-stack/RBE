# RBE Monitor – Data Ownership, Change Control & Support Model

## 1. Data Ownership

| Data Domain | Primary Owner | Secondary / Steward |
|-------------|---------------|---------------------|
| Equipment master (ID, type, criticality, shaft) | Reliability Superintendent (site) | Platform Admin |
| Downtime / status events | Operations Supervisor (shift) + Reliability Engineer | Reliability Superintendent |
| Failure-mode & root-cause taxonomy | Reliability Engineer (central) | OEM / Standards body liaison |
| Maintenance intervals & work-order linkage | Maintenance Planner | Reliability |
| User roles & shaft scoping | Platform Admin | Site Security / HR |
| Calculation parameters & gates | Central Reliability Authority | Platform Engineering |

**Rule:** No single role may both create a high-value downtime event and close it without a second set of eyes when criticality = A (or equivalent). Separation of duties is enforced in Phase 1+.

## 2. Change Control

Any change to:
- Status / resolution / failure-mode code lists
- Criticality matrix or scoring weights
- Availability / MTBF / MTTR gates or formulas
- Import validation limits
- RBAC permission matrix

**requires:**
1. Written RFC (Request for Change) in the platform change log.
2. Dual approval: Central Reliability Authority + Platform Admin.
3. Version bump of the calculation module and update of FORMULAS.md / DATA_MODEL.md.
4. Test evidence attached (unit + sample fleet replay).
5. Communication to all shaft Reliability Engineers before production promotion.

Emergency hot-fixes (security / data-loss) may be applied under Platform Admin authority with post-facto review within 48 h.

## 3. Support Model

### Tiers

| Tier | Scope | Response | Escalation |
|------|-------|----------|------------|
| L1 – Site Support | Login, basic navigation, import help, filter issues | Same shift | Reliability Engineer |
| L2 – Reliability / Platform | Calculation questions, data-quality flags, taxonomy overrides | 1 business day | Platform Admin / Central Reliability |
| L3 – Engineering | Bugs, performance, security, new integrations | 4 h (P1) / 2 days (P2) | Vendor / xAI-support channel if applicable |

### Channels
- In-app “Report data quality issue” → creates audited ticket.
- Email / Teams channel monitored by L2.
- Critical outage (system unavailable) → on-call Platform Admin.

### SLA Targets (Phase 1+)
- P1 (system down / data corruption): 4 h restore.
- P2 (incorrect KPI visible to executives): 1 business day.
- P3 (cosmetic / enhancement): backlog.

## 4. Audit & Compliance Positioning

- Audit log is append-only.
- All material changes (status close, criticality, role, import) are audited with actor, timestamp, before/after.
- Data residency: currently Firebase region as configured; any future hybrid / on-prem component will publish explicit residency statements.
- Encryption at rest and in transit as provided by the underlying cloud provider; additional application-level encryption for highly sensitive fields can be added in Phase 1.

## 5. Training & Handover

- Reliability Engineers receive a short “honest metrics” briefing covering gates, “Insufficient data”, and how free-text is treated.
- Operators receive structured status / close-action training only.
- Board / Executive packs always include the data-quality strip so confidence is visible.

---
*This model is effective from the Phase 0 release. Full server-side enforcement of ownership and separation of duties arrives with Phase 1.*
