# Arena V18.7 + V18.8 — Final Security Audit

## Scope

This audit covers the cumulative Arena security release from V18.2 through V18.8, with emphasis on the remaining supply-chain and adversarial phases and the final regression pass after the last code changes.

## Code changes in the final pass

1. Client route parsing was hardened against malformed percent-encoding and unsafe decoded route IDs. Invalid encoded identifiers now resolve to a not-found route instead of throwing.
2. Firestore `shareToken` lookup now uses a server-side query limit of one document, bounding an otherwise unnecessary public-query result set.
3. Account deletion received a regression test that rejects extra JSON properties before workspace cleanup.
4. The repository README and environment example were updated so the release documentation no longer advertises the retired legacy review-token query switch.

## Security coverage

### Ownership and authorization

- Authenticated APIs verify Firebase identity through Identity Toolkit.
- Firebase UID ownership gates project operations.
- Firestore browser writes are restricted by field/type/value allowlists.
- Project and version lifecycle remains server-authoritative.
- Cloudinary asset deletion validates ownership and immutable asset identity.

### Abuse resistance

- Review password attempts, comments, decisions, and API mutations have bounded rate limits.
- Request body and security-header sizes are bounded.
- Public review video/comment retrieval is bounded.
- Share-token lookup is bounded to one matching Firestore document.

### Session / destructive actions

- Password-protected review access uses a short-lived `HttpOnly`/`SameSite=Strict` cookie.
- Protected review mutations require CSRF proof.
- Account deletion requires recent Firebase authentication and exact confirmation text.
- Auth/session errors are sanitized before reaching callers.

### Browser / HTTP

- CSP is configured without `script-src unsafe-eval`.
- Framing is denied with both CSP `frame-ancestors` and `X-Frame-Options`.
- Referrers are reduced to the origin.
- HSTS, nosniff, Permissions Policy, CORP and related headers are configured.
- Navigation helpers reject unsafe URL schemes and malformed routes.

### Privacy / data minimization

- Public review responses do not expose reviewer email addresses.
- Review tokens are not placed in API query parameters by the Arena client.
- Client-side local storage cleanup is scoped to Arena-owned keys.
- Provider response bodies are not written to server logs.

### Supply chain

- Direct dependencies are exact-pinned.
- Lockfile v3 is consistent with package metadata.
- Lock entries use npm registry URLs with integrity metadata.
- Git/file/HTTP dependency specifications are rejected by the security contract.
- Install lifecycle scripts are not used by the root package.

## Final verification results

- `npm run test:security` — PASS for V18.2, V18.3/V18.4, V18.5/V18.6, V18.7 and V18.8.
- `node --check` — PASS for 18 API/security-test `.js/.mjs` files.
- TypeScript parser — PASS for 60 JS/JSX/MJS/CJS files.
- Relative import resolver — PASS, 152 relative imports with 0 missing targets.
- External import declaration scan — PASS, `firebase`, `react`, and `react-dom` are declared.
- Application dangerous-sink/secret/token-leak scan — PASS, 0 findings across 51 application JS/JSX/MJS files.
- Vercel header/SPA-rewrite contract — PASS.
- Lockfile/pinning/integrity contract — PASS for 254 lock packages.
- Firestore browser-lifecycle-write inventory — PASS: project/version lifecycle writes are delegated to the server API.

## Negative-path tests intentionally exercised

The final runtime suite intentionally produces expected error logs while confirming safe responses for rate limiting, cross-origin rejection, oversized requests, stale authentication, Firestore 404 replay handling, request conflicts, oversized review headers, missing CSRF and untrusted Cloudinary references.

## Validation limitations

The environment could not perform a registry-backed `npm audit`, because DNS access to `registry.npmjs.org` failed with `EAI_AGAIN`.

The environment also lacks the project's installed executable dependency tree, so `npm run lint` and `npm run build` return `eslint: not found` and `vite: not found` rather than a source failure.

Firebase CLI / Emulator tooling is not installed, so `firestore.rules` was contract-tested and statically reviewed but not executed through the official rules emulator here.

These are infrastructure/tooling limitations. They are not being reported as successful production validation.

## Release posture

The cumulative security patch is internally regression-tested and packaged, but production readiness still requires the environment-backed checks listed above. The process-local rate limiter remains an architectural interim control; high-scale abuse protection should use a shared/distributed limiter or edge/WAF/KV layer.
