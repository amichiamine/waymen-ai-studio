-- =====================================================================
-- KA Tech Hub — schéma MySQL / MariaDB
-- =====================================================================
-- JUMEAU OBLIGATOIRE de api/schema/schema.sqlite.sql.
-- Toute modification ici doit être reportée là-bas dans le MÊME ORDRE :
-- `php api/tools/verifier-parite-schema.php` échoue sinon, et la CI avec lui.
--
-- Correspondances de types imposées par le vérificateur de parité :
--   TEXT (sqlite)            <-> VARCHAR(n) | TEXT | LONGTEXT
--   TEXT /* JSON */ (sqlite) <-> JSON
--   INTEGER (sqlite)         <-> INT | BIGINT | TINYINT
--   ... PRIMARY KEY AUTOINCREMENT <-> ... AUTO_INCREMENT PRIMARY KEY
--
-- Les colonnes indexées, uniques ou clés primaires sont en VARCHAR : MySQL
-- refuse un index sur TEXT sans longueur de préfixe.
-- =====================================================================

-- ---------------------------------------------------------------- 01
CREATE TABLE IF NOT EXISTS categories (
  slug          VARCHAR(64) NOT NULL PRIMARY KEY,
  label         VARCHAR(191) NOT NULL,
  description   TEXT NOT NULL,
  cover         VARCHAR(512) NULL,
  position      INT NOT NULL DEFAULT 0,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 02
CREATE TABLE IF NOT EXISTS brands (
  id            VARCHAR(64) NOT NULL PRIMARY KEY,
  name          VARCHAR(191) NOT NULL,
  description   TEXT NULL,
  country       VARCHAR(96) NULL,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 03
CREATE TABLE IF NOT EXISTS products (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  name          JSON NOT NULL,
  brand         VARCHAR(96) NOT NULL DEFAULT '',
  category      VARCHAR(64) NOT NULL,
  use_tags      JSON NOT NULL,
  spec_line     JSON NULL,
  specs         JSON NULL,
  price         INT NOT NULL DEFAULT 0,
  old_price     INT NULL,
  stock         VARCHAR(16) NOT NULL DEFAULT 'in',
  stock_qty     INT NULL,
  image         VARCHAR(512) NOT NULL DEFAULT '',
  best_seller   TINYINT NOT NULL DEFAULT 0,
  sale          TINYINT NOT NULL DEFAULT 0,
  custom_build  TINYINT NOT NULL DEFAULT 0,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_brand ON products (brand);
CREATE INDEX idx_products_price ON products (price);
CREATE INDEX idx_products_catalogue ON products (custom_build, category);

-- ---------------------------------------------------------------- 04
CREATE TABLE IF NOT EXISTS customers (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  name          VARCHAR(191) NOT NULL,
  email         VARCHAR(191) NOT NULL DEFAULT '',
  phone         VARCHAR(48) NOT NULL DEFAULT '',
  wilaya        VARCHAR(64) NOT NULL DEFAULT '',
  orders_count  INT NOT NULL DEFAULT 0,
  total_spent   INT NOT NULL DEFAULT 0,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_customers_email ON customers (email);

-- ---------------------------------------------------------------- 05
CREATE TABLE IF NOT EXISTS orders (
  id              VARCHAR(64) NOT NULL PRIMARY KEY,
  customer_id     VARCHAR(96) NULL,
  customer_name   VARCHAR(191) NOT NULL,
  customer_email  VARCHAR(191) NULL,
  subtotal        INT NOT NULL DEFAULT 0,
  discount        INT NOT NULL DEFAULT 0,
  coupon_code     VARCHAR(64) NULL,
  shipping        INT NOT NULL DEFAULT 0,
  total           INT NOT NULL DEFAULT 0,
  status          VARCHAR(24) NOT NULL DEFAULT 'pending',
  status_history  JSON NOT NULL,
  payment_method  VARCHAR(64) NOT NULL DEFAULT '',
  payment_label   VARCHAR(191) NULL,
  wilaya          VARCHAR(64) NOT NULL DEFAULT '',
  delivery_kind   VARCHAR(16) NOT NULL DEFAULT 'home',
  address         TEXT NOT NULL,
  phone           VARCHAR(48) NOT NULL DEFAULT '',
  note            TEXT NULL,
  created_at      VARCHAR(32) NOT NULL,
  updated_at      VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at);

-- ---------------------------------------------------------------- 06
-- Lignes de commande : `name` est une EMPREINTE, chaîne simple figée à
-- l'écriture. Ne jamais la relire depuis products.
CREATE TABLE IF NOT EXISTS order_items (
  id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id      VARCHAR(64) NOT NULL,
  product_id    VARCHAR(96) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  price         INT NOT NULL DEFAULT 0,
  qty           INT NOT NULL DEFAULT 1,
  image         VARCHAR(512) NULL,
  position      INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- ---------------------------------------------------------------- 07
CREATE TABLE IF NOT EXISTS coupons (
  code          VARCHAR(64) NOT NULL PRIMARY KEY,
  type          VARCHAR(16) NOT NULL DEFAULT 'percent',
  value         INT NOT NULL DEFAULT 0,
  min_purchase  INT NOT NULL DEFAULT 0,
  expires_at    VARCHAR(32) NULL,
  usage_count   INT NOT NULL DEFAULT 0,
  usage_limit   INT NOT NULL DEFAULT 0,
  active        TINYINT NOT NULL DEFAULT 1,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 08
CREATE TABLE IF NOT EXISTS reviews (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  product_id    VARCHAR(96) NOT NULL,
  product_name  VARCHAR(255) NOT NULL,
  customer_name VARCHAR(191) NOT NULL,
  rating        INT NOT NULL DEFAULT 5,
  title         VARCHAR(255) NOT NULL DEFAULT '',
  body          TEXT NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_reviews_product ON reviews (product_id);
CREATE INDEX idx_reviews_status ON reviews (status);

-- ---------------------------------------------------------------- 09
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  name          VARCHAR(191) NOT NULL DEFAULT '',
  email         VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(24) NOT NULL DEFAULT 'customer',
  active        TINYINT NOT NULL DEFAULT 1,
  phone         VARCHAR(48) NULL,
  last_login    VARCHAR(32) NULL,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_users_role ON users (role);

-- ---------------------------------------------------------------- 10
CREATE TABLE IF NOT EXISTS blog_posts (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  slug          VARCHAR(191) NOT NULL UNIQUE,
  title         JSON NOT NULL,
  excerpt       JSON NULL,
  content       JSON NULL,
  cover         VARCHAR(512) NULL,
  author        VARCHAR(191) NOT NULL DEFAULT '',
  tags          JSON NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'draft',
  published_at  VARCHAR(32) NULL,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_blog_posts_status ON blog_posts (status);

-- ---------------------------------------------------------------- 11
CREATE TABLE IF NOT EXISTS media_assets (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  src           LONGTEXT NOT NULL,
  mime          VARCHAR(128) NOT NULL DEFAULT '',
  size          INT NOT NULL DEFAULT 0,
  tag           VARCHAR(64) NULL,
  created_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_media_assets_tag ON media_assets (tag);

-- ---------------------------------------------------------------- 12
-- `is_read` et non `read` : READ est un mot réservé MySQL.
CREATE TABLE IF NOT EXISTS notifications (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  body          TEXT NOT NULL,
  level         VARCHAR(16) NOT NULL DEFAULT 'info',
  is_read       TINYINT NOT NULL DEFAULT 0,
  link          VARCHAR(512) NULL,
  created_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_notifications_read ON notifications (is_read);

-- ---------------------------------------------------------------- 13
CREATE TABLE IF NOT EXISTS messages (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  name          VARCHAR(191) NOT NULL,
  email         VARCHAR(191) NOT NULL DEFAULT '',
  phone         VARCHAR(48) NULL,
  subject       VARCHAR(255) NOT NULL DEFAULT '',
  body          TEXT NOT NULL,
  is_read       TINYINT NOT NULL DEFAULT 0,
  created_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_messages_read ON messages (is_read);

-- ---------------------------------------------------------------- 14
CREATE TABLE IF NOT EXISTS subscribers (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  email         VARCHAR(191) NOT NULL UNIQUE,
  source        VARCHAR(64) NULL,
  created_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 15
-- `wilaya_code` vaut « * » pour le tarif par défaut.
CREATE TABLE IF NOT EXISTS shipping_rates (
  wilaya_code   VARCHAR(8) NOT NULL PRIMARY KEY,
  home          INT NOT NULL DEFAULT 0,
  desk          INT NOT NULL DEFAULT 0,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 16
CREATE TABLE IF NOT EXISTS payment_methods (
  id            VARCHAR(64) NOT NULL PRIMARY KEY,
  label         VARCHAR(191) NOT NULL,
  instructions  TEXT NOT NULL,
  active        TINYINT NOT NULL DEFAULT 1,
  position      INT NOT NULL DEFAULT 0,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 17
-- `product_name` : EMPREINTE en chaîne simple, figée à l'écriture.
CREATE TABLE IF NOT EXISTS stock_movements (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  product_id    VARCHAR(96) NOT NULL,
  product_name  VARCHAR(255) NOT NULL DEFAULT '',
  delta         INT NOT NULL DEFAULT 0,
  reason        VARCHAR(255) NOT NULL DEFAULT '',
  created_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_stock_movements_product ON stock_movements (product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements (created_at);

-- ---------------------------------------------------------------- 18
-- Contenu éditorial : une ligne par section (`home`, `about`, `footer`,
-- `home-reviews`, `ticker`, `builder`…), charge utile JSON semi-structurée.
CREATE TABLE IF NOT EXISTS site_content (
  section       VARCHAR(64) NOT NULL PRIMARY KEY,
  payload       JSON NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 19
-- Réglages : une ligne par portée (`site`, `shipping`).
CREATE TABLE IF NOT EXISTS settings (
  scope         VARCHAR(64) NOT NULL PRIMARY KEY,
  payload       JSON NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- 20
CREATE TABLE IF NOT EXISTS audit_logs (
  id            VARCHAR(96) NOT NULL PRIMARY KEY,
  actor         VARCHAR(191) NOT NULL DEFAULT 'système',
  action        VARCHAR(128) NOT NULL,
  entity        VARCHAR(191) NOT NULL DEFAULT '',
  detail        TEXT NULL,
  created_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- ---------------------------------------------------------------- 21
-- Outbox : effets de bord différés (emails, webhooks) écrits dans la MÊME
-- transaction que le fait métier, dépilés ensuite par un cron.
CREATE TABLE IF NOT EXISTS outbox (
  id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  topic         VARCHAR(128) NOT NULL,
  payload       JSON NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts      INT NOT NULL DEFAULT 0,
  last_error    TEXT NULL,
  available_at  VARCHAR(32) NOT NULL,
  processed_at  VARCHAR(32) NULL,
  created_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX idx_outbox_pending ON outbox (status, available_at);
