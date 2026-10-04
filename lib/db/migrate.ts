import type { DB } from "./index";

// Versioned migrations. The schema version lives in SQLite's own `user_version`, so each migration runs exactly once.
// Add new entries to the END of this list; never edit one that has shipped.
const MIGRATIONS: string[] = [
  /* 1: initial schema */ `
  CREATE TABLE categories (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE,
    blurb TEXT NOT NULL DEFAULT '',
    sort  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE products (
    id          TEXT PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    price       INTEGER NOT NULL CHECK (price > 0),          -- whole US dollars
    colour      TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    details     TEXT NOT NULL DEFAULT '[]',                  -- short JSON list of bullet points
    active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    sort        INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX idx_products_category ON products (category_id, active, sort);

  CREATE TABLE product_images (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pos        INTEGER NOT NULL,
    photo_key  TEXT NOT NULL,
    focus      TEXT NOT NULL DEFAULT '50% 50%',
    PRIMARY KEY (product_id, pos)
  ) WITHOUT ROWID;

  CREATE TABLE product_tags (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag        TEXT NOT NULL,
    PRIMARY KEY (product_id, tag)
  ) WITHOUT ROWID;
  CREATE INDEX idx_tags_tag ON product_tags (tag);

  -- Stock is tracked per size. One row per sellable variant.
  CREATE TABLE variants (
    id         INTEGER PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size       TEXT NOT NULL,
    sort       INTEGER NOT NULL DEFAULT 0,
    stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), -- the database itself refuses to oversell
    UNIQUE (product_id, size)
  );

  CREATE TABLE users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    hash       TEXT NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'customer')),
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_users_role ON users (role);

  CREATE TABLE orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL REFERENCES users(id),
    total      INTEGER NOT NULL,                              -- whole US dollars, for reporting
    status     TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    address    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    restocked  INTEGER NOT NULL DEFAULT 0 CHECK (restocked IN (0, 1))
  );
  CREATE INDEX idx_orders_user    ON orders (user_id, created_at DESC);
  CREATE INDEX idx_orders_created ON orders (created_at);
  CREATE INDEX idx_orders_status  ON orders (status, created_at);
  INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', 1000);  -- order numbers start at 1001

  CREATE TABLE order_items (
    id         INTEGER PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    variant_id INTEGER REFERENCES variants(id),
    size       TEXT NOT NULL,
    qty        INTEGER NOT NULL CHECK (qty > 0),
    price      INTEGER NOT NULL                               -- unit price at the time of purchase
  );
  CREATE INDEX idx_items_order   ON order_items (order_id);
  CREATE INDEX idx_items_product ON order_items (product_id);

  CREATE TABLE payments (
    order_id       INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    provider       TEXT NOT NULL,
    session_id     TEXT NOT NULL UNIQUE,
    currency       TEXT NOT NULL CHECK (currency IN ('USD', 'BDT')),
    rate           REAL NOT NULL,
    amount_minor   INTEGER NOT NULL,
    status         TEXT NOT NULL CHECK (status IN ('requires_payment', 'paid', 'failed', 'expired', 'canceled', 'refunded')),
    attempts       INTEGER NOT NULL DEFAULT 0,
    expires_at     INTEGER NOT NULL,
    method_brand   TEXT,
    method_last4   TEXT,
    pending_brand  TEXT,
    pending_last4  TEXT,
    failure        TEXT
  );
  -- A small partial index covering only unpaid sessions makes the expiry sweep near-instant at any scale.
  CREATE INDEX idx_payments_open ON payments (expires_at) WHERE status = 'requires_payment';

  -- Remembers every processed gateway event so a replayed webhook can never be applied twice.
  CREATE TABLE payment_events (
    event_id    TEXT PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    received_at INTEGER NOT NULL
  ) WITHOUT ROWID;
  `,
];

export function migrate(d: DB) {
  const current = d.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    d.transaction(() => {
      d.exec(MIGRATIONS[v]);
      d.pragma(`user_version = ${v + 1}`);
    })();
  }
}
