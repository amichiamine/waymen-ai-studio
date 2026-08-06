-- =====================================================================
-- KA Tech Hub — schéma SQLite
-- =====================================================================
-- JUMEAU OBLIGATOIRE de api/schema/schema.mysql.sql.
-- Toute modification ici doit être reportée là-bas dans le MÊME ORDRE :
-- `php api/tools/verifier-parite-schema.php` échoue sinon, et la CI avec lui.
--
-- Conventions imposées par le double pilote (PLAN.md) :
--   * booléens  → INTEGER 0/1 (SQLite n'a pas de type booléen)
--   * dates     → TEXT ISO-8601 UTC, jamais de type date natif
--   * JSON      → TEXT marqué `/* JSON */` ici, colonne JSON en MySQL ;
--                 le marqueur est lu par le vérificateur de parité
--   * montants  → INTEGER en DZD, jamais de décimale
--
-- Champs multilingues (Localized<string>, cf. docs/LOCALIZED-DATA.md) :
--   products.name, products.spec_line, products.specs,
--   blog_posts.title, blog_posts.excerpt, blog_posts.content.
--
-- Empreintes historiques en CHAÎNE SIMPLE, jamais localisées : la langue y est
-- résolue à l'écriture pour qu'une facture ne change jamais rétroactivement
-- (décision de la phase 3) :
--   order_items.name, stock_movements.product_name, reviews.product_name.
-- =====================================================================

-- ---------------------------------------------------------------- 01
CREATE TABLE IF NOT EXISTS categories (
  slug          TEXT NOT NULL PRIMARY KEY,
  label         TEXT NOT NULL,
  description   TEXT NOT NULL,
  cover         TEXT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 02
CREATE TABLE IF NOT EXISTS brands (
  id            TEXT NOT NULL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NULL,
  country       TEXT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 03
CREATE TABLE IF NOT EXISTS products (
  id            TEXT NOT NULL PRIMARY KEY,
  name          TEXT /* JSON */ NOT NULL,
  brand         TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL,
  use_tags      TEXT /* JSON */ NOT NULL,
  spec_line     TEXT /* JSON */ NULL,
  specs         TEXT /* JSON */ NULL,
  price         INTEGER NOT NULL DEFAULT 0,
  old_price     INTEGER NULL,
  stock         TEXT NOT NULL DEFAULT 'in',
  stock_qty     INTEGER NULL,
  image         TEXT NOT NULL DEFAULT '',
  best_seller   INTEGER NOT NULL DEFAULT 0,
  sale          INTEGER NOT NULL DEFAULT 0,
  custom_build  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_catalogue ON products (custom_build, category);

-- ---------------------------------------------------------------- 04
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT NOT NULL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  wilaya        TEXT NOT NULL DEFAULT '',
  orders_count  INTEGER NOT NULL DEFAULT 0,
  total_spent   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

-- ---------------------------------------------------------------- 05
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT NOT NULL PRIMARY KEY,
  customer_id     TEXT NULL,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NULL,
  subtotal        INTEGER NOT NULL DEFAULT 0,
  discount        INTEGER NOT NULL DEFAULT 0,
  coupon_code     TEXT NULL,
  shipping        INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  status_history  TEXT /* JSON */ NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT '',
  payment_label   TEXT NULL,
  wilaya          TEXT NOT NULL DEFAULT '',
  delivery_kind   TEXT NOT NULL DEFAULT 'home',
  address         TEXT NOT NULL,
  phone           TEXT NOT NULL DEFAULT '',
  note                TEXT NULL,
  invoice_snapshot    TEXT /* JSON */ NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);

-- ---------------------------------------------------------------- 06
-- Lignes de commande : `name` est une EMPREINTE, chaîne simple figée à
-- l'écriture. Ne jamais la relire depuis products.
CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  order_id      TEXT NOT NULL,
  product_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  price         INTEGER NOT NULL DEFAULT 0,
  qty           INTEGER NOT NULL DEFAULT 1,
  image         TEXT NULL,
  position      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

-- ---------------------------------------------------------------- 07
CREATE TABLE IF NOT EXISTS coupons (
  code          TEXT NOT NULL PRIMARY KEY,
  type          TEXT NOT NULL DEFAULT 'percent',
  value         INTEGER NOT NULL DEFAULT 0,
  min_purchase  INTEGER NOT NULL DEFAULT 0,
  expires_at    TEXT NULL,
  usage_count   INTEGER NOT NULL DEFAULT 0,
  usage_limit   INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 08
CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT NOT NULL PRIMARY KEY,
  product_id    TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  rating        INTEGER NOT NULL DEFAULT 5,
  title         TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);

-- ---------------------------------------------------------------- 09
CREATE TABLE IF NOT EXISTS users (
  id            TEXT NOT NULL PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  active        INTEGER NOT NULL DEFAULT 1,
  phone         TEXT NULL,
  last_login    TEXT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ---------------------------------------------------------------- 10
CREATE TABLE IF NOT EXISTS blog_posts (
  id            TEXT NOT NULL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT /* JSON */ NOT NULL,
  excerpt       TEXT /* JSON */ NULL,
  content       TEXT /* JSON */ NULL,
  cover         TEXT NULL,
  author        TEXT NOT NULL DEFAULT '',
  tags          TEXT /* JSON */ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',
  published_at  TEXT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status);

-- ---------------------------------------------------------------- 11
CREATE TABLE IF NOT EXISTS media_assets (
  id            TEXT NOT NULL PRIMARY KEY,
  name          TEXT NOT NULL,
  src           TEXT NOT NULL,
  mime          TEXT NOT NULL DEFAULT '',
  size          INTEGER NOT NULL DEFAULT 0,
  tag           TEXT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_assets_tag ON media_assets (tag);

-- ---------------------------------------------------------------- 12
-- `is_read` et non `read` : READ est un mot réservé MySQL.
CREATE TABLE IF NOT EXISTS notifications (
  id            TEXT NOT NULL PRIMARY KEY,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  level         TEXT NOT NULL DEFAULT 'info',
  is_read       INTEGER NOT NULL DEFAULT 0,
  link          TEXT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (is_read);

-- ---------------------------------------------------------------- 13
CREATE TABLE IF NOT EXISTS messages (
  id            TEXT NOT NULL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NULL,
  subject       TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL,
  is_read       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages (is_read);

-- ---------------------------------------------------------------- 14
CREATE TABLE IF NOT EXISTS subscribers (
  id            TEXT NOT NULL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  source        TEXT NULL,
  created_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 15
-- `wilaya_code` vaut « * » pour le tarif par défaut.
CREATE TABLE IF NOT EXISTS shipping_rates (
  wilaya_code   TEXT NOT NULL PRIMARY KEY,
  home          INTEGER NOT NULL DEFAULT 0,
  desk          INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 16
CREATE TABLE IF NOT EXISTS payment_methods (
  id            TEXT NOT NULL PRIMARY KEY,
  label         TEXT NOT NULL,
  instructions  TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  position      INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 17
-- `product_name` : EMPREINTE en chaîne simple, figée à l'écriture.
CREATE TABLE IF NOT EXISTS stock_movements (
  id            TEXT NOT NULL PRIMARY KEY,
  product_id    TEXT NOT NULL,
  product_name  TEXT NOT NULL DEFAULT '',
  delta         INTEGER NOT NULL DEFAULT 0,
  reason        TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements (created_at);

-- ---------------------------------------------------------------- 18
-- Contenu éditorial : une ligne par section (`home`, `about`, `footer`,
-- `home-reviews`, `ticker`, `builder`…), charge utile JSON semi-structurée.
CREATE TABLE IF NOT EXISTS site_content (
  section       TEXT NOT NULL PRIMARY KEY,
  payload       TEXT /* JSON */ NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 19
-- Réglages : une ligne par portée (`site`, `shipping`).
CREATE TABLE IF NOT EXISTS settings (
  scope         TEXT NOT NULL PRIMARY KEY,
  payload       TEXT /* JSON */ NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------- 20
CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT NOT NULL PRIMARY KEY,
  actor         TEXT NOT NULL DEFAULT 'système',
  action        TEXT NOT NULL,
  entity        TEXT NOT NULL DEFAULT '',
  detail        TEXT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);

-- ---------------------------------------------------------------- 21
-- Outbox : effets de bord différés (emails, webhooks) écrits dans la MÊME
-- transaction que le fait métier, dépilés ensuite par un cron.
CREATE TABLE IF NOT EXISTS outbox (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  topic         TEXT NOT NULL,
  payload       TEXT /* JSON */ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT NULL,
  available_at  TEXT NOT NULL,
  processed_at  TEXT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox (status, available_at);

-- ---------------------------------------------------------------- 22
-- Jetons de réinitialisation de mot de passe (vague 4.3).
-- On ne stocke QUE l'empreinte SHA-256 du secret : une fuite de cette table ne
-- permet donc pas de réinitialiser un compte. `used_at` rend le jeton à usage
-- unique ; `expires_at` en borne la durée de vie.
CREATE TABLE IF NOT EXISTS password_resets (
  id            TEXT NOT NULL PRIMARY KEY,
  user_id       TEXT NOT NULL,
  token_hash    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  used_at       TEXT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets (expires_at);

-- ---------------------------------------------------------------- 23
-- Tentatives de connexion — limitation de débit (vague 4.5).
-- On ne stocke QUE le hash SHA-256 de l'IP et de l'email (champ `cle`) :
-- une fuite de cette table ne révèle ni adresses IP ni emails.
-- Les lignes expirées sont purgées par le CRON.
CREATE TABLE IF NOT EXISTS login_attempts (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  axe           TEXT NOT NULL,
  cle           TEXT NOT NULL,
  action        TEXT NOT NULL DEFAULT 'login',
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_axe_cle ON login_attempts (axe, cle, action, created_at);
