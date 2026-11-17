# Arena V18.8 — Cloudinary Verification Fix

This patch makes a focused correction to the signed video-upload pipeline.

## Changed application files

1. `api/lib/cloudinary.js`
   - Supports an opt-in video-metadata lookup for Cloudinary Admin API asset-ID requests.
   - Adds `image_metadata=true` only for version verification.
   - Normalizes Cloudinary's `video_duration` (or `duration` / `audio_duration` fallback) to the `duration` field used by Arena's existing server-side validation.
   - Keeps deletion lookups on the original lightweight request path.

2. `api/project.js`
   - Requests video metadata when verifying a newly uploaded version.
   - Retains all current asset identity, ownership, type, format, byte-size, URL, and duration validation.

3. `src/lib/cloudinary.js`
   - Returns both `videoUrl` and the existing `url` alias from successful uploads.
   - This preserves compatibility while satisfying the `videoUrl` field consumed by `src/lib/firestore.js`.

## Regression coverage

- `security-tests/v18.2-cloudinary-runtime.test.mjs` checks the Admin API metadata query and duration normalization.
- `security-tests/v18.2-data-boundary.test.mjs` checks the verifier requests metadata.
- `security-tests/v18.8-adversarial.test.mjs` checks the browser upload result includes the canonical `videoUrl` field.

## Unchanged

- Signed Cloudinary upload authorization.
- No unsigned upload preset requirement.
- Firebase authentication and Firestore ownership boundaries.
- Firestore lifecycle write restrictions.
- Cloudinary asset ID, public ID, folder ownership, format, file-size, and secure URL checks.
- UI components and review workflow.

## Validation performed

- `npm run test:security` — PASS.
- `node security-tests/v18.8.2-login.test.mjs` — PASS.
- `node --check` on all API and security-test JS/MJS files — PASS.

A production Vite build was not completed in the packaging environment because `npm ci` did not finish before the installation timeout, leaving the Vite executable unavailable. Run `npm ci` and `npm run build` locally or in Vercel before promoting this build.
