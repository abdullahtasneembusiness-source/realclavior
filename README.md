# Clovior

The operating system for the team behind the info business.

## Stack

Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS + Realtime) · Tailwind + shadcn/ui · Claude API · Stripe · Resend.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Database

Schema + RLS policies live in `supabase/migrations/`. Apply them via the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste each migration file's contents into the Supabase Dashboard's SQL Editor, in filename order.

## Testing

`npm run build` and `npm run lint` run on every push via GitHub Actions (`.github/workflows/ci.yml`).

End-to-end tests (`tests/e2e/`) drive a real Chromium browser against a real, disposable local Supabase stack — not mocks. In CI this happens automatically. To run them yourself:

```bash
npx supabase start        # spins up local Postgres + Auth + API via Docker, applies migrations
npx supabase status -o json   # copy API_URL / ANON_KEY / SERVICE_ROLE_KEY into .env.local
npm run test:e2e
npx supabase stop
```
