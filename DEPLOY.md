# Deploy to Vercel (mobile app in the browser)

Your app works as a **PWA** on phones — install from Safari/Chrome after deploy.

## 1. Database (required — Vercel cannot use SQLite)

Use free **[Neon](https://neon.tech)** Postgres:

1. Create a project at neon.tech  
2. Copy the **connection string** (pooled) → `DATABASE_URL`  
3. Copy the **direct** connection string → `DIRECT_URL`  

For local dev you can run Postgres with Docker:

```bash
docker compose up -d
```

Then copy `.env.example` to `.env` and use the local URLs.

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Grocery Budget ZA"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

## 3. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**  
2. Import your GitHub repo  
3. **Environment variables** (Production):

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | Neon pooled connection string |
   | `DIRECT_URL` | Neon direct connection string |
   | `SERPAPI_API_KEY` | *(optional)* for live web prices in **Prices** tab |

4. Deploy  

## 4. Seed production data (once)

On your PC, with production URLs in `.env`:

```bash
npm install
npx prisma db push
npm run db:seed
```

Or temporarily set `DATABASE_URL` to Neon in the terminal and run the same commands.

## 5. Use on your phone

1. Open your Vercel URL, e.g. `https://your-app.vercel.app`  
2. **Add to Home Screen** (iPhone/Android)  
3. Works like an app — no PC needed after deploy  

## Features on mobile

- **Prices** tab — search any product, top 5 cheapest stores  
- **Slip** — scan receipts  
- **List** — monthly shop list + cheapest store  
- Dark mode UI  

## Optional: live web prices

Add `SERPAPI_API_KEY` on Vercel to blend Google Shopping results into the **Prices** search. Without it, search uses the built-in SA store catalog (Checkers, PnP, Spar, etc.).
