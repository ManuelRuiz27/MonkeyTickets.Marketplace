-- MonoMarket D1 Database Schema (SQLite)
-- Simplified version of Prisma schema for Cloudflare Workers

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ORGANIZER',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organizers table
CREATE TABLE IF NOT EXISTS organizers (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  fee_plan_id TEXT,
  complementary_tickets_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  venue TEXT,
  address TEXT,
  city TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  capacity INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  is_public INTEGER NOT NULL DEFAULT 1,
  is_unlisted INTEGER NOT NULL DEFAULT 0,
  access_token TEXT UNIQUE,
  max_tickets_per_purchase INTEGER NOT NULL DEFAULT 5,
  pdf_template_path TEXT,
  qr_code_x INTEGER,
  qr_code_y INTEGER,
  qr_code_width INTEGER,
  attendance_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE
);

-- Ticket Templates table
CREATE TABLE IF NOT EXISTS ticket_templates (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL,
  event_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  quantity INTEGER NOT NULL,
  sold INTEGER NOT NULL DEFAULT 0,
  is_complementary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- Buyers table
CREATE TABLE IF NOT EXISTS buyers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  total REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  platform_fee_amount REAL NOT NULL DEFAULT 0,
  organizer_income_amount REAL NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  reserved_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  gateway TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'PENDING',
  gateway_transaction_id TEXT,
  payment_method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'VALID',
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES ticket_templates(id)
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES ticket_templates(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
