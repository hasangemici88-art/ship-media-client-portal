CREATE TABLE IF NOT EXISTS deleted_customers (
  customer_id TEXT PRIMARY KEY,
  deleted_by_email TEXT NOT NULL,
  deleted_by_role TEXT NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT NOT NULL DEFAULT 'Owner deleted customer from Client Portal'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  customer_id TEXT,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON audit_logs(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type, created_at DESC);
