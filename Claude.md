# Claude.md

## Project Context
5starmemo - A spaced repetition learning system with mobile app and web dashboard.
BFF architecture: web-api (management), mobile-api (student), web-dashboard (Next.js), mobile-app (Expo).

## Development Guidelines
- Keep the codebase lean. Delete dead code rather than commenting it out or guarding it.
- Don't over-engineer: no abstractions for one-time operations, no feature flags, no designing for hypothetical future requirements.
- Production requirements (security, store compliance, deployment config) are not bloat — implement them simply and directly.
- Prefer fixing root causes over adding defensive wrappers around broken code.