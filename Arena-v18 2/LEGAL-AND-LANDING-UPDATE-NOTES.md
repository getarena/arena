# Arena V18.9 — Legal & Landing Update

## Included
- Reworked Privacy Policy, Terms of Service, Acceptable Use and Security pages in `src/components/LegalPages.jsx`.
- Public-facing descriptions of account data, workspace/review content, reviewer information, technical information, providers, review-link sharing, browser storage, retention/deletion, privacy requests and contact.
- Terms covering user content and permissions, account security, acceptable use, third-party providers, service availability, deletion, disclaimers, liability and indemnity.
- Landing-page hero scroll motion now uses eased progress and requestAnimationFrame scheduling to reduce scroll-handler work.
- Native smooth anchor scrolling with reduced-motion support.

## Before a public launch
These pages are a product-specific drafting update, not a legal opinion or a guarantee of compliance. Have a qualified lawyer review them for the operator's actual legal identity, business structure, governing law, liability language and the jurisdictions where Arena will be offered. In particular:
- Replace the generic reference to the “operator of Arena” with the correct legal name and business/contact address.
- Confirm the stated providers and actual production data flows remain accurate whenever the stack changes.
- Confirm the INR 1,000 no-fee liability cap is appropriate and enforceable for the operator and target markets.
- Review child/minor handling and any obligations that apply under the laws where users are located.
- If analytics, advertising, payments, AI processing, new integrations or additional data collection are introduced, update the policy and obtain any required notice/consent before enabling them.

## Validation
- `npm run test:security` passes all included V18.2–V18.8 security suites.
- Production build not run in this environment because project dependencies are not installed here. Run `npm ci` then `npm run build` before deploying.
