# RBE Monitor Enterprise — Admin runbook

Production site target: **www.rbemonitor.co.za**

## Feature flags (in HTML module script)

| Flag | Production value | Effect |
|------|------------------|--------|
| `DISABLE_PUBLIC_SIGNUP` | `true` | Hides “Create an account”; blocks self-registration |
| `ENFORCE_SHAFT_SCOPE` | `true` | Non-admins can only act on `allowedShafts` |

## Invite a user

1. Sign in as **admin** → **User Management**.
2. Enter email, role, multi-select **Allowed shafts**, optional company number → **Save invite**.
3. Create the Firebase Auth user (Firebase Console → Authentication, or Admin SDK / password-reset link).
4. On first login the profile activates (`status: pending` → `active`). If a users doc already exists for that email, the invite updates role + shafts.

## Assign role + shaft scope

- **User Management** → **Edit** on a row, or set fields on `users/{uid}`:
  - `role`: `admin` | `reliability` | `operations` | `executive` | `viewer`
  - `allowedShafts`: `string[]` (empty = no operational access when scope enforced; admins exempt)
  - `status`: `active` | `disabled` | `pending`

## Disable a user

1. User Management → **Disable** (sets `status: disabled`).
2. Also disable the Auth account in Firebase Console for a hard lock.

## Technical / service accounts

- Mint **short-lived custom tokens** from Cloud Functions using a service account.
- Do **not** store end-user passwords for integrations.
- Prefer custom claims for `role` + `allowedShafts` when possible; log `actorType: service` in audit.

## Deploy security rules

```bash
firebase deploy --only firestore:rules
```

Use the example in `firestore.rules` (same folder). Rules deny unauthenticated access, block client role elevation, and make `audit_log` append-only.

## Migration of existing users

On first login after this build, if `allowedShafts` is missing, the app writes **all known shafts** once (`migratedShaftScope: true`) so existing operators are not locked out. Admins should then tighten scopes per operation.

## Production checklist

- [ ] Deploy `firestore.rules`
- [ ] Confirm `DISABLE_PUBLIC_SIGNUP = true` and `ENFORCE_SHAFT_SCOPE = true`
- [ ] Configure OIDC/SAML (Azure AD / Google) when available; keep email/password + MFA as secondary
- [ ] Invite operators with correct `allowedShafts`
- [ ] Verify Audit Trail writes (login, import, status, role changes)
- [ ] Rotate technical-user credentials periodically
