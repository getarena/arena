# Arena V18.8

Arena is a React + Vite application with Firebase Authentication, Firestore, Vercel serverless API routes, and signed Cloudinary video uploads.

## Environment variables

Copy `.env.example` for local client configuration. Configure the server-only values in Vercel Environment Variables:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — complete Firebase service-account JSON. Keep it server-only; never use a `VITE_` prefix.
- `FIREBASE_API_KEY` — optional server-side alias for the Firebase Web API key. The API falls back to `VITE_FIREBASE_API_KEY` when this is omitted.
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET` — server-only; never use a `VITE_` prefix.
- `ARENA_ALLOWED_ORIGINS` — optional comma-separated trusted browser origins.

The browser app also requires the six `VITE_FIREBASE_*` values listed in `.env.example`.

## Cloudinary uploads

V18.8 uses server-generated signed video uploads. An unsigned upload preset is not required by the current upload flow. The backend verifies the uploaded asset through the Cloudinary Admin API before creating a Firestore version.

## Firestore rules

The deployable rules are in `firestore.rules`. The original `firestore.txt` is retained as supplied. Review the rules against your current application before publishing them to a Firebase project.

## Local checks

Use Node.js 20.19 or newer. Install dependencies with `npm ci`, then run `npm run build`, `npm run lint`, and `npm run test:security`. The separate Google-login regression check is `node security-tests/v18.8.2-login.test.mjs`.

The old `ARENA_ALLOW_LEGACY_QUERY_REVIEW_TOKEN` migration switch is not used by V18.8.
