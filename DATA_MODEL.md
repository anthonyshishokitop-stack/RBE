# RBE Monitor Enterprise – Updated Data Model & Validation Rules

**Version:** 2.0 (Production Remediation)  
**Audience:** Data owners, reliability engineers, platform support  
**Applies to:** Multi-site underground mining fleets (locos, LHDs, drills, etc.)

## 1. Core Entities

### 1.1 Equipment (Master)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string (PK) | Yes | Unique, normalised (no LOCO prefix, no special chars) |
| shaft | string | Yes | Site/shaft code (data-scoped) |
| level / workplace | string | No | |
| equipmentType | enum | Yes | Loco, LHD, Drill, Utility, Other |
| oem | string | No | |
| criticality | enum | Yes | A / B / C (or 1–5) |
| installationDate | ISO date | Recommended | |
| designLifeHours | number | No | |
| meterHours | number | No | Runtime hours (last reading) |
| meterKm | number | No | |
| statusCode | enum | Yes | See Status Codes |
| lastStatusAt | ISO timestamp | Yes | |
| source | string | Yes | Manual / Import / Integration |
| createdAt / updatedAt | timestamp | Yes | Server-generated preferred |
| updatedBy / updatedByUid | string | Yes | |

**Validation:** ID uniqueness enforced on write. Criticality change requires elevated role + audit.

### 1.2 Downtime / Status Event (status_updates)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| equipmentId | string (FK) | Yes | |
| startAt | ISO timestamp | **Yes** | Start of the event |
| endAt | ISO timestamp | Yes if closed | Null while open |
| durationHours | number | Calculated | (endAt − startAt) / 3600000; never free-entered as primary |
| statusCode | enum | Yes | Down, Restricted, Up, Standby, OutOfService, UnderInvestigation |
| resolutionCode | enum | Yes when closed | Repaired, Adjusted, NoFaultFound, Deferred, Replaced, Other |
| failureModeCode | string | Recommended | ISO 14224 style taxonomy |
| rootCauseCode | string | Recommended | |
| delayCodes | array | No | Spares, Labour, Access, Logistics, Other |
| isFailure | boolean | Calculated / Yes | True only for genuine failure transitions to Down that are later closed |
| reason / comment | string | Free text only | **Never** used to override statusCode |
| shift | string | No | |
| shaft | string | Yes | Denormalised for scoping |
| source | string | Yes | |
| createdAt, updatedAt | timestamp | Yes | |
| updatedBy* | string | Yes | Actor fields |
| fingerprint | string | System | For hard de-duplication |

**Non-negotiable rules:**
- Every downtime event **must** have `startAt`. `endAt` required to close.
- `durationHours` is always derived; client may display but must not be the source of truth.
- Single event capped at configurable max (default 72 h). Longer events flagged as outliers.
- Free-text never changes statusCode or resolutionCode.
- Hard de-duplication on import and on save using fingerprint (equipmentId + startAt ± tolerance + statusCode + normalised reason hash).

### 1.3 Maintenance Task
| Field | Type | Required |
|-------|------|----------|
| equipmentId | string | Yes |
| intervalType | enum | Calendar / Runtime / Condition |
| intervalValue | number | Yes |
| lastDoneAt | timestamp | Yes |
| nextDueAt / nextDueHours | calculated | Yes |
| workOrderId | string | Recommended |
| linkedDowntimeIds | array | No |
| status | enum | Open / Overdue / Complete |

### 1.4 Audit Log (append-only)
| Field | Type | Notes |
|-------|------|-------|
| id | auto | |
| actorUid, actorEmail, actorRole | string | |
| action | string | e.g. status_close, criticality_change, import |
| objectType, objectId | string | |
| before, after | map | Material fields only |
| timestamp | serverTimestamp | |
| sourceIp / userAgent | optional | |
| source | string | ui / api / import / system |

Written by privileged service account where possible. Client writes are accepted only for non-critical paths and still audited.

## 2. Structured Codes (Canonical)

**Status Codes**  
`Down` | `Restricted` | `Up` | `Standby` | `OutOfService` | `UnderInvestigation`

**Resolution / Closure Codes**  
`Repaired` | `Adjusted` | `Replaced` | `NoFaultFound` | `Deferred` | `Cancelled` | `Other`

**Failure Mode (starter ISO 14224 style)**  
Mechanical, Electrical, Hydraulic, Pneumatic, Structural, ControlSystem, OperatorInduced, Unknown, Other

## 3. Data Density Gates (Calculation Engine)

| Metric | Minimum data required | Behaviour if insufficient |
|--------|-----------------------|---------------------------|
| Availability (window) | ≥ 7 calendar days observation **and** ≥ 1 valid event or continuous status | Show “Insufficient data” / grey |
| MTBF | ≥ 3 closed failure events **and** ≥ 30 days observation | “Insufficient data” |
| MTTR | ≥ 3 closed failure events with valid start/end | “Insufficient data” |
| Event-based risk score | ≥ 5 status events or ≥ 14 days | Show with low-confidence badge |
| RUL / Predictive | **Not implemented** | Label removed or “Not available – model not calibrated” |

## 4. Import Validation Rules

- Reject or flag any row where claimed downtimeHours > 72 (or configurable).
- Reject zero-duration “failures”.
- Require equipmentId and a date/time that can produce startAt.
- Soft-key + hard fingerprint de-duplication.
- Quarantine extreme outliers into a review queue (do not auto-publish to production KPIs).

## 5. Ownership & Change Control

- **Data Owner:** Reliability Superintendent (per shaft or site).
- **Change Control:** Any change to status taxonomy, criticality matrix, or calculation parameters requires documented RFC + dual approval (Reliability + Platform Admin).
- **Support Model:** See SUPPORT_MODEL.md.

---
*This model is the target state. The current Firebase SPA implements a progressive subset; full server-side enforcement and event-store require the backend phase of the roadmap.*
