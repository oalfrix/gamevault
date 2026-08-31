-- =============================================================================
-- Gamesarena — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor (or `supabase db push` with the CLI)
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- GAMES  (also stores mods, distinguished by type = 'mod')
-- ---------------------------------------------------------------------------
create table if not exists games (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  type           text not null default 'game' check (type in ('game','mod')),
  base_game      text,                          -- e.g. "GTA V" — only used for mods
  cover_url      text,
  genres         text[] default '{}',
  description    text,
  requirements   jsonb,                         -- { minimum: {...}, recommended: {...} }
  price          numeric(10,2) not null default 0,   -- normal price, KSh
  offer_price    numeric(10,2),                 -- set to run a discount; null = no offer
  is_free        boolean not null default false,     -- toggle to make it free at any time
  download_url   text not null,                 -- ONLY ever returned via the serverless
                                                  -- functions after payment is confirmed —
                                                  -- never selected directly from the browser.
  popularity     integer not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Example: turn a game free for a weekend, or start a sale, straight from SQL:
--   update games set is_free = true where slug = 'some-game';
--   update games set offer_price = 499 where slug = 'some-game';
--   update games set offer_price = null, is_free = false where slug = 'some-game'; -- end offer

-- ---------------------------------------------------------------------------
-- ORDERS  (one row per checkout attempt / STK push)
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  game_id               uuid not null references games(id),
  phone                 text not null,
  amount                numeric(10,2) not null,      -- copied server-side from games.price/offer_price
  status                text not null default 'pending'
                          check (status in ('pending','paid','failed','cancelled')),
  mpesa_checkout_id     text,                          -- CheckoutRequestID from Daraja
  mpesa_receipt         text,                          -- filled in by the callback on success
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_orders_checkout_id on orders (mpesa_checkout_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- The browser only ever uses the anon key, so lock things down tightly:
-- games can be read (except download_url is never selected by client code —
-- keep it that way in the frontend), orders are written/read only by the
-- Netlify Functions using the service_role key (which bypasses RLS).
-- ---------------------------------------------------------------------------
alter table games enable row level security;
alter table orders enable row level security;

create policy "Public can read published games"
  on games for select
  using (published = true);

-- No insert/update/delete policies for games/orders for the anon role —
-- catalog + order management happens via the Supabase dashboard, a future
-- admin panel, or directly by the service_role key in Netlify Functions.

-- ---------------------------------------------------------------------------
-- Sample data (delete or edit as you like)
-- ---------------------------------------------------------------------------
insert into games (slug, title, type, cover_url, genres, description, requirements, price, offer_price, is_free, download_url, popularity)
values (
  'skyforge-legends',
  'Skyforge Legends',
  'game',
  'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600',
  array['Action','RPG'],
  'An open-world action RPG where you forge alliances between rival sky-cities and battle for the last floating throne.',
  '{"minimum":{"os":"Windows 10 64-bit","cpu":"Intel i5-4460","ram":"8 GB","gpu":"GTX 960 2GB","storage":"45 GB","directx":"11"},
    "recommended":{"os":"Windows 11 64-bit","cpu":"Intel i7-9700K","ram":"16 GB","gpu":"RTX 2060","storage":"45 GB SSD","directx":"12"}}',
  1499, 999, false,
  'https://example.com/downloads/skyforge-legends.zip',
  87
),
(
  'pixel-raiders',
  'Pixel Raiders',
  'game',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600',
  array['Platformer','Indie'],
  'A retro-styled co-op platformer where two raiders race through procedurally generated dungeons.',
  '{"minimum":{"os":"Windows 10","cpu":"Dual Core 2.4GHz","ram":"4 GB","gpu":"Integrated","storage":"2 GB","directx":"10"}}',
  0, null, true,
  'https://example.com/downloads/pixel-raiders.zip',
  52
),
(
  'skyforge-hd-textures',
  'HD Texture Overhaul',
  'mod',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600',
  array['Visual'],
  '4K texture replacement pack for Skyforge Legends — armor, terrain and sky-city facades.',
  null,
  299, null, false,
  'https://example.com/downloads/skyforge-hd-textures.zip',
  40
);
update games set base_game = 'Skyforge Legends' where slug = 'skyforge-hd-textures';
