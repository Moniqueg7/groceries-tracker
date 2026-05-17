# Grocery Budget ZA

Personal grocery budget assistant for South Africa — dark mode, mobile-friendly, deployable to Vercel.

## Features

- **Prices tab** — search any product, see **top 5 cheapest** (Checkers, PnP, Spar, Shoprite, Woolworths, Makro)
- **Monthly budget** — track spend and what’s left
- **Scan receipt** — OCR till slips
- **Monthly list** — cheapest store for your regular shop
- **PWA** — add to home screen on iPhone/Android

## Local setup

Uses **PostgreSQL** (same as Vercel). Easiest: free [Neon](https://neon.tech) URL in `.env`, or Docker:

```bash
docker compose up -d
cp .env.example .env
# edit DATABASE_URL in .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel (use on phone anywhere)

See **[DEPLOY.md](./DEPLOY.md)**. Build only runs `prisma generate && next build` (no db push on Vercel).

1. Add `DATABASE_URL` (Neon Postgres) in Vercel env vars  
2. Deploy  
3. Once from your PC: `npx prisma db push` and `npm run db:seed` using the same URL  

After deploy, open your `https://….vercel.app` URL → **Add to Home Screen**.

## Optional live web prices

Set `SERPAPI_API_KEY` on Vercel ([serpapi.com](https://serpapi.com)) to merge Google Shopping results into the **Prices** search.

## Update catalog prices

Edit `prisma/seed.ts`, then:

```bash
npm run db:seed
```
