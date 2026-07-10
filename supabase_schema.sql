-- AlmaTek Supabase Schema
-- Run this in your Supabase project's SQL Editor (supabase.com → your project → SQL Editor)

-- ── INVENTORY ──────────────────────────────────────────────────────────────
-- id is TEXT so it can hold the same Airtable rec* IDs from your existing data.
-- opening_qty = stock on hand at migration time (imported from Airtable).
-- Actual qty is computed by the inventory_current view below.
CREATE TABLE IF NOT EXISTS inventory (
  id           TEXT PRIMARY KEY,            -- Airtable rec* ID (e.g. recABC123)
  name         TEXT    NOT NULL DEFAULT '',
  stock_status TEXT    DEFAULT 'In Stock',  -- 'In Stock' | 'O.O.S.' | 'orderSoon'
  opening_qty  INTEGER DEFAULT 0,           -- opening balance at migration
  category     TEXT    DEFAULT '',          -- 'iphone_screen' | 'battery' | 'android' etc.
  min_stock    INTEGER DEFAULT 0,
  model        TEXT    DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── ORDERS (incoming stock) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       TEXT,                           -- inventory.id
  item_name     TEXT    DEFAULT '',             -- denormalized for display
  qty           INTEGER NOT NULL DEFAULT 1,
  supplier      TEXT    DEFAULT '',
  date_received TIMESTAMPTZ,
  status        TEXT    DEFAULT 'pending',      -- 'pending' | 'inv received'
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── SOLD (parts used for repairs) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sold (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    TEXT,
  qty        INTEGER NOT NULL DEFAULT 1,
  date_sold  DATE    DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── REMOVED (manual waste / removal) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS removed (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      TEXT,
  qty          INTEGER NOT NULL DEFAULT 1,
  date_removed DATE    DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── INVENTORY CURRENT QTY VIEW ────────────────────────────────────────────
-- Mirrors Airtable's formula fields: qty = opening + received_orders - sold - removed.
-- "received" orders = orders marked 'inv received' OR direct-receive orders (no supplier).
CREATE OR REPLACE VIEW inventory_current AS
SELECT
  i.id, i.name, i.stock_status, i.category, i.min_stock, i.model, i.created_at,
  GREATEST(0,
    COALESCE(i.opening_qty, 0)
    + COALESCE((
        SELECT SUM(o.qty) FROM orders o
        WHERE o.item_id = i.id
          AND (o.status = 'inv received' OR o.supplier IS NULL OR o.supplier = '')
      ), 0)
    - COALESCE((SELECT SUM(s.qty) FROM sold s WHERE s.item_id = i.id), 0)
    - COALESCE((SELECT SUM(r.qty) FROM removed r WHERE r.item_id = i.id), 0)
  ) AS qty
FROM inventory i;

-- ── LEADS ─────────────────────────────────────────────────────────────────
-- All lead fields stored as JSONB (camelCase keys, matching the app exactly).
CREATE TABLE IF NOT EXISTS leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fields     JSONB   NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── TICKETS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fields     JSONB   NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── REVIEW ASKR ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_askr (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fields     JSONB   NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── DISABLE ROW LEVEL SECURITY ────────────────────────────────────────────
-- Auth is handled by the Cloudflare Worker (X-Auth header + service_role key).
-- These tables are only reachable through the Worker, never from the browser directly.
ALTER TABLE inventory   DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders      DISABLE ROW LEVEL SECURITY;
ALTER TABLE sold        DISABLE ROW LEVEL SECURITY;
ALTER TABLE removed     DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads       DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets     DISABLE ROW LEVEL SECURITY;
ALTER TABLE review_askr DISABLE ROW LEVEL SECURITY;
