# Tusavor management dashboard

This Next.js 15 application is Tusavor's management and content-curation
surface. It talks to `web-api`; it is not the student application and must not
expose individual learner progress.

Read the repository [README](../README.md), [production and cost guidance](../CLAUDE.md),
and [Carte design system](../DESIGN.md) before changing a user-facing workflow.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run build
```

Run lint separately because the Next.js production build does not enforce it.
The root README records the repository-wide validation expectations.

## Configuration and data safety

The dashboard uses these environment-variable names:

- `NEXT_PUBLIC_WEB_API_URL`
- `R2_PUBLIC_URL`

Do not record their deployed values or credentials in this file. When the
dashboard is configured for the production API, management actions can change
live data. Use only an authorized management test account and keep deployments
explicit.

## Fonts

Fraunces, Inter, and Newsreader are stored under `src/app/fonts/` so dashboard
builds do not depend on Google Fonts being reachable. The corresponding SIL
Open Font License files are stored beside the font files.
