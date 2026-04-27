# Claude.md

## Project Context
5starmemo - A spaced repetition learning system with mobile app and web dashboard.
BFF architecture: web-api (management), mobile-api (student), web-dashboard (Next.js), mobile-app (Expo).

## Development Guidelines
- Keep the codebase lean. Delete dead code rather than commenting it out or guarding it.
- Don't over-engineer: no abstractions for one-time operations, no feature flags, no designing for hypothetical future requirements.
- Production requirements (security, store compliance, deployment config) are not bloat — implement them simply and directly.
- Prefer fixing root causes over adding defensive wrappers around broken code.

## Cost safeguards

MVP — any new recurring cost is a problem. Paid services in use:
- OVH VPS-1 (fixed ~$7/mo) + "Standard" automated backup add-on
- Cloudflare R2 + Cloudflare DNS (tusavor.com)

No other SaaS is wired up. Alerts configured: Cloudflare billing at $1, R2 usage at ~80% of free tier (8 GB storage, 800K Class A ops, 8M Class B ops). Free tier itself: 10 GB-month storage, 1M Class A/mo, 10M Class B/mo, free egress.

Ask before recommending anything that:
- Enables an OVH add-on (snapshots, additional disks, additional IPs) or upgrades the VPS plan.
- Adds a Cloudflare paid product (Workers Paid, Images, Stream, a second R2 bucket).
- Adds a new third-party SaaS of any kind (Sentry, Resend/SendGrid, analytics, hosted DB, Expo EAS paid tier, etc.).
- Weakens the upload guards in `web-api/src/routes/upload.ts`: `authenticateToken` + `requireManagement` gate, 5 MB `fileSize` cap, sharp resize + WebP re-encode, or single-endpoint design. Do not add a second upload path on mobile-api.
- Opens a public/unauthenticated write path to R2 or to VPS disk.
- Introduces per-request R2 `ListObjects` / `HeadObject` calls in hot paths — Class A ops add up fast.

If a proposed feature would push R2 storage or ops past the free tier at projected scale, flag it and offer a cheaper design before writing code. When debugging a suspected cost spike, check the Cloudflare alerts and R2 metrics dashboard before touching code.