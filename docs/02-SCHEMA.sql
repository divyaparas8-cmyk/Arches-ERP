-- 02 — Arches Production ERP · Postgres schema
-- Run against an empty database, then 03-SEED.sql.
-- Mirror this in prisma/schema.prisma; this file is the authority on shape and constraints.
-- All money is INTEGER PENCE. Never numeric, never float.

BEGIN;

-- ---------- reference data ----------

CREATE TABLE vendors (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL,              -- capability, e.g. 'Cut & Sew · Screen Print'
  loc         TEXT NOT NULL,
  lead        TEXT NOT NULL,              -- free text, e.g. '3–4 wks'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE colorways (
  code        CHAR(3) PRIMARY KEY,
  name        TEXT NOT NULL,
  hex         CHAR(7) NOT NULL,
  vendor_name TEXT                        -- mill's own colour name, e.g. 'Optic White'
);

CREATE TYPE sku_category AS ENUM
  ('T-Shirts','Sweats','Bottoms','Bags','Headwear','Outerwear','Accessories');

CREATE TABLE skus (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  cat         sku_category NOT NULL,
  gsm         TEXT NOT NULL DEFAULT '—',
  brand       TEXT NOT NULL DEFAULT 'Arches Blanks',
  vendor_id   INT REFERENCES vendors(id),
  base_pence  INT NOT NULL CHECK (base_pence >= 0),   -- default SELL per unit
  cost_pence  INT NOT NULL CHECK (cost_pence >= 0),   -- default VENDOR COST per unit
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE embellishments (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  vendor_id   INT REFERENCES vendors(id),
  price_pence INT NOT NULL CHECK (price_pence >= 0),  -- default SELL add-on per unit
  cost_pence  INT NOT NULL CHECK (cost_pence >= 0),   -- default VENDOR COST per unit
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  contact     TEXT,
  email       TEXT,
  loc         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- users & auth ----------

CREATE TYPE user_role AS ENUM ('owner','sales','production','accounting','client');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  client_id     INT REFERENCES clients(id),   -- required when role = 'client', else NULL
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_users_have_a_client
    CHECK ((role = 'client') = (client_id IS NOT NULL))
);

-- ---------- orders ----------

CREATE TYPE order_status AS ENUM ('active','declined');

CREATE TABLE orders (
  id              TEXT PRIMARY KEY,             -- 'ARC-1042'
  seq             INT NOT NULL UNIQUE,          -- numeric part, drives allocation
  client_id       INT NOT NULL REFERENCES clients(id),
  contact         TEXT,
  stage           SMALLINT NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 7),
  status          order_status NOT NULL DEFAULT 'active',
  declined_reason TEXT,
  weeks           SMALLINT NOT NULL DEFAULT 6,
  shipping_pence  INT NOT NULL DEFAULT 0,
  progress        SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  prod_start      DATE,
  tracking        TEXT,
  carrier         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE order_seq START 1056;   -- seed data occupies 1039–1055

CREATE TABLE line_items (
  id              SERIAL PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position        SMALLINT NOT NULL,
  sku_code        TEXT NOT NULL REFERENCES skus(code),
  color_code      CHAR(3) NOT NULL REFERENCES colorways(code),
  qty             INT NOT NULL CHECK (qty > 0),
  override_pence  INT CHECK (override_pence >= 0),  -- manual unit SELL; NULL = use build-up

  -- per-line snapshot/override of the blank's economics
  blank_vendor_id   INT REFERENCES vendors(id),
  blank_cost_pence  INT,
  blank_sell_pence  INT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, position)
);

-- one row per embellishment on a line; the override columns are NULL unless edited
CREATE TABLE line_embellishments (
  id            SERIAL PRIMARY KEY,
  line_id       INT NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
  emb_code      TEXT NOT NULL REFERENCES embellishments(code),
  vendor_id     INT REFERENCES vendors(id),
  cost_pence    INT,
  sell_pence    INT,
  UNIQUE (line_id, emb_code)
);

-- ---------- artwork ----------

CREATE TABLE artworks (
  id          SERIAL PRIMARY KEY,
  line_id     INT NOT NULL UNIQUE REFERENCES line_items(id) ON DELETE CASCADE,
  ver         SMALLINT NOT NULL DEFAULT 1,
  approved    BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE artwork_files (
  id          SERIAL PRIMARY KEY,
  artwork_id  INT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  ver         SMALLINT NOT NULL,
  url         TEXT NOT NULL,
  filename    TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- comments & log ----------

CREATE TYPE comment_author AS ENUM ('client','internal');

-- scope = 'order' → order thread; scope = 'artwork' → per-SKU thread
CREATE TYPE comment_scope AS ENUM ('order','artwork');

CREATE TABLE comments (
  id          SERIAL PRIMARY KEY,
  scope       comment_scope NOT NULL,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  artwork_id  INT REFERENCES artworks(id) ON DELETE CASCADE,
  who         comment_author NOT NULL,
  name        TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT artwork_comments_have_artwork
    CHECK ((scope = 'artwork') = (artwork_id IS NOT NULL))
);

CREATE TYPE actor AS ENUM ('Sales','Design','Production','Accounting','System','Xero');

CREATE TABLE activity_log (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  who         actor NOT NULL,
  user_id     INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_order_idx ON activity_log (order_id, created_at DESC);

-- ---------- xero ----------

CREATE TYPE xero_status AS ENUM ('queued','synced','error');
CREATE TYPE xero_kind   AS ENUM ('deposit','balance');

CREATE TABLE xero_records (
  id             SERIAL PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind           xero_kind NOT NULL DEFAULT 'deposit',
  ref            TEXT,                       -- 'INV-2042'
  xero_invoice_id TEXT,                      -- Xero's own GUID
  status         xero_status NOT NULL DEFAULT 'queued',
  note           TEXT,
  amount_pence   INT,
  paid_pence     INT NOT NULL DEFAULT 0,
  last_error     TEXT,
  synced_at      TIMESTAMPTZ,
  UNIQUE (order_id, kind)
);

-- single-row connection state
CREATE TABLE xero_connection (
  id             BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  connected      BOOLEAN NOT NULL DEFAULT false,
  org            TEXT,
  tenant_id      TEXT,
  access_token   TEXT,        -- encrypt at rest
  refresh_token  TEXT,        -- encrypt at rest
  expires_at     TIMESTAMPTZ,
  auto_push      BOOLEAN NOT NULL DEFAULT true,
  last_sync      TIMESTAMPTZ
);
INSERT INTO xero_connection (id) VALUES (true);

-- ---------- email outbox (audit of what the client was sent) ----------

CREATE TABLE email_log (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT REFERENCES orders(id) ON DELETE CASCADE,
  template    TEXT NOT NULL,     -- 'quote' | 'confirmation' | 'artwork' | 'milestone-20' | ...
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  provider_id TEXT,
  status      TEXT NOT NULL DEFAULT 'sent',
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
