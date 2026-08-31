# GameVault

A responsive game/mod resell store: browse & sort games, view description + system
requirements, pay with **M-Pesa STK Push**, and get auto-redirected to the download
link the moment payment is confirmed. Games or mods can be flagged **free** or put
**on offer** at any time. Stack: static HTML/CSS/JS frontend, **Supabase** (Postgres)
for the catalog and orders, **Netlify Functions** for the M-Pesa integration, deployed
straight from **GitHub**.

## How the pieces fit together

```
Browser (index.html / game.html / mods.html)
   │  reads games catalog directly (Supabase anon key, read-only via RLS)
   ▼
Supabase (Postgres: games, orders tables)
   ▲
   │  price lookups, order writes, download_url (service role key — server only)
Netlify Functions (/netlify/functions)
   │  stkpush.js       → starts the M-Pesa prompt
   │  stkcallback.js   ← Safaricom calls this when the user approves/declines
   │  checkstatus.js   → frontend polls this; returns download_url once "paid"
   │  claim-free.js    → skips payment entirely for is_free = true titles
   ▼
Safaricom Daraja API (STK Push)
```

The browser **never** sees the download link or the price it's about to be charged
until the server has looked both up itself — so nobody can edit the page and pay
less, and nobody gets a download link without a confirmed payment.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql` from this repo — it creates
   the `games` and `orders` tables, sets Row Level Security so the public can only
   *read published games*, and inserts a couple of sample games/mods.
3. Go to **Settings → API** and copy:
   - `Project URL` → used as `SUPABASE_URL`
   - `anon public` key → goes in the frontend (`SUPABASE_ANON_KEY`)
   - `service_role` key → goes in Netlify env vars only, **never** in frontend code

## 2. Set up M-Pesa (Safaricom Daraja)

1. Create an app at [developer.safaricom.co.ke](https://developer.safaricom.co.ke) and
   enable **Lipa Na M-Pesa Online (STK Push)**.
2. Sandbox testing uses shortcode `174379` and Safaricom's public test passkey (shown
   on the Daraja "Test Credentials" page) — good for building without a live till.
3. When ready to accept real payments, apply for a **Paybill or Till number**, get it
   go-live approved, and switch `MPESA_ENV=production` with your real shortcode/passkey.
4. Your callback URL (`MPESA_CALLBACK_URL`) must be a public HTTPS URL — Netlify gives
   you one automatically once deployed, e.g.
   `https://your-site.netlify.app/.netlify/functions/stkcallback`.

## 3. Push to GitHub

```bash
cd gamevault
git init
git add .
git commit -m "Initial GameVault store"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/gamevault.git
git push -u origin main
```

## 4. Deploy on Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing
   project → GitHub** → pick your `gamevault` repo.
2. Build settings: **Build command** — leave blank (static site, nothing to build).
   **Publish directory** — `.` (already set in `netlify.toml`).
3. **Site settings → Environment variables** — add all the variables from
   `.env.example`:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MPESA_ENV`, `MPESA_CONSUMER_KEY`,
   `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`.
4. Deploy. Then update `MPESA_CALLBACK_URL` to your real `*.netlify.app` (or custom
   domain) URL and redeploy so Safaricom calls the right address.
5. Open `index.html`, `game.html`, and `mods.html` in this repo and replace the
   placeholder `SUPABASE_URL` / `SUPABASE_ANON_KEY` in the inline `<script>` tag near
   the top of each file with your real Supabase **anon** key (safe to expose — it's
   restricted by Row Level Security). Commit and push; Netlify redeploys automatically.

## 5. Managing your catalog

Everything is driven from the `games` table in Supabase — no code changes needed to:

- **Add a game or mod** — insert a row (`type = 'game'` or `'mod'`). Mods show up
  automatically on `mods.html`; games on `index.html`.
- **Run a sale** — `update games set offer_price = 799 where slug = '...';`. The
  strike-through price and "SALE" badge appear automatically, and the STK push amount
  updates to match, since the function looks the price up live.
- **Make something free** — `update games set is_free = true where slug = '...';`.
  The buy button switches to "Get Free Download" and skips M-Pesa entirely.
- **End an offer** — `update games set offer_price = null where slug = '...';`.

## 6. Editing socials, branding, nav

Edit `js/layout.js` — the `SOCIAL` object at the top holds your WhatsApp and Telegram
links, and the nav/footer markup lives right below it (shared across every page).

## Local development

```bash
npm install -g netlify-cli
cd gamevault
npm install
netlify dev
```

`netlify dev` serves the static site and runs the Netlify Functions locally on one
port, reading env vars from a local `.env` file (copy `.env.example` → `.env`).

## Security notes

- The **service role key** and M-Pesa secrets live only in Netlify's environment
  variables and inside `netlify/functions` code that runs server-side — never in any
  file the browser downloads.
- `download_url` is a column in `games`, but the frontend's Supabase queries never
  select it — it's only ever returned by `checkstatus.js` / `claim-free.js`, and only
  after an order's status is `paid`.
- Order amounts are always resolved server-side from the database, never trusted from
  the browser, so the price a user pays can't be tampered with client-side.
