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
