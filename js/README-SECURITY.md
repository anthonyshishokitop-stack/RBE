# RBE Monitor – Frontend Split & Security Notes

## What was done
The original single `index.html` (~280 KB, 5200 lines) has been split into:

- `index.html`          – HTML shell only (no business logic)
- `css/styles.css`      – all styles
- `js/app.js`           – main application module (Firebase, RBAC, dashboard, import, etc.)
- `js/sidebar.js`       – sidebar UI controller

## Why this helps against casual theft
1. View-Source no longer gives the complete working system in one file.
2. A thief must download and correctly reassemble multiple files + keep relative paths.
3. You can further protect by serving JS from a private CDN / with short-lived signed URLs, or by minifying + obfuscating `app.js`.

## What this does NOT protect against
- Anyone with DevTools can still see the loaded JS and Firebase config.
- Real security comes from **Firestore Security Rules** (already documented inside app.js) and server-side enforcement.
- Never rely on client-side hiding for authorization.

## Recommended next hardening steps
1. Deploy the example Firestore rules that are already commented inside `app.js`.
2. Minify + obfuscate `js/app.js` (e.g. terser + javascript-obfuscator) before production.
3. Serve the app only over HTTPS and enable Firebase App Check.
4. Move any highly sensitive calculations to Cloud Functions.
5. Rotate the Firebase API key if it was ever committed publicly (keys are public by design, but rotation is still good hygiene).

