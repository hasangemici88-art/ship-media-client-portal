CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  service_requested TEXT NOT NULL,
  lead_source TEXT NOT NULL DEFAULT 'Livablinds.com',
  submission_date TEXT NOT NULL,
  assigned_staff TEXT NOT NULL DEFAULT 'Unassigned',
  current_status TEXT NOT NULL DEFAULT 'New Lead',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_customers_status ON customers(current_status);
CREATE INDEX idx_customers_submission ON customers(submission_date DESC);

CREATE TABLE customer_notes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  body TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_customer ON customer_notes(customer_id, created_at DESC);
