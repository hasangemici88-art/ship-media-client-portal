import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { PortalActor } from "./permissions";
import { Customer, CustomerNote, LeadStatus } from "./types";
import { isLeadStatus } from "./utils";

type D1Like = {
  prepare: (query: string) => {
    bind: (...args: unknown[]) => { run: () => Promise<{ meta: { changes: number } }>; first: <T = unknown>() => Promise<T | null>; all: <T = unknown>() => Promise<{ results: T[] }> };
    run: () => Promise<{ meta: { changes: number } }>;
    first: <T = unknown>() => Promise<T | null>;
    all: <T = unknown>() => Promise<{ results: T[] }>;
  };
};

function getDb(): D1Like | null {
  try {
    const { env } = getCloudflareContext();
    const db = (env as unknown as { DB?: D1Like }).DB;
    return db ?? null;
  } catch {
    return null;
  }
}

const leadSchema = z.object({
  customerId: z.string().min(1).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  serviceRequested: z.string().min(1),
  leadSource: z.string().min(1).default("Livablinds.com"),
  submissionDate: z.string().optional(),
  assignedStaff: z.string().default("Unassigned"),
  currentStatus: z.string().default("New Lead"),
});

type CustomerRow = {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  address: string;
  service_requested: string;
  lead_source: string;
  submission_date: string;
  assigned_staff: string;
  current_status: string;
};

type NoteRow = {
  id: string;
  customer_id: string;
  body: string;
  user_name: string;
  created_at: string;
};

type DeletedCustomerRow = {
  customer_id: string;
};

async function ensureControlTables(db: D1Like) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS deleted_customers (
        customer_id TEXT PRIMARY KEY,
        deleted_by_email TEXT NOT NULL,
        deleted_by_role TEXT NOT NULL,
        deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
        reason TEXT NOT NULL DEFAULT 'Owner deleted customer from Client Portal'
      )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        customer_id TEXT,
        actor_email TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();

  await db
    .prepare("CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON audit_logs(customer_id, created_at DESC)")
    .run();

  await db
    .prepare("CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type, created_at DESC)")
    .run();
}

function rowToCustomer(row: CustomerRow, notes: CustomerNote[]): Customer {
  const status = row.current_status || "New Lead";
  return {
    customerId: row.customer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number,
    email: row.email,
    address: row.address,
    serviceRequested: row.service_requested,
    leadSource: row.lead_source,
    submissionDate: row.submission_date,
    assignedStaff: row.assigned_staff,
    currentStatus: isLeadStatus(status) ? status : "New Lead",
    internalNotes: notes,
  };
}

function noteRowToNote(row: NoteRow): CustomerNote {
  return {
    id: row.id,
    body: row.body,
    userName: row.user_name,
    timestamp: row.created_at,
  };
}

const sheetName = process.env.GOOGLE_SHEETS_TAB_NAME || "Sayfa1";
const spreadsheetId =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
  "1qvRKCRNOrigNoUKHPWWstnmxQtOdvVG50zvt4TXwWqA";

function normalizeHeader(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  return rows;
}

function sheetRowToCustomer(row: string[]): Customer {
  const status = row[10] || "New Lead";

  return {
    customerId: row[0] || "",
    firstName: row[1] || "",
    lastName: row[2] || "",
    phoneNumber: row[3] || "",
    email: row[4] || "",
    address: row[5] || "",
    serviceRequested: row[6] || "",
    leadSource: row[7] || "",
    submissionDate: row[8] || "",
    assignedStaff: row[9] || "Unassigned",
    currentStatus: isLeadStatus(status) ? status : "New Lead",
    internalNotes: [],
  };
}

async function getCustomersFromGoogleSheet(): Promise<Customer[]> {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheetName);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }

  const rows = parseCsv(await response.text());
  const headerIndex = rows.findIndex((row) => normalizeHeader(row[0]) === "customerid");
  const dataRows = rows
    .slice(headerIndex === -1 ? 1 : headerIndex + 1)
    .filter((row) => row.some(Boolean) && normalizeHeader(row[0]) !== "customerid");

  return dataRows.map(sheetRowToCustomer);
}

export async function getCustomers(): Promise<Customer[]> {
  const sheetCustomers = await getCustomersFromGoogleSheet();
  const db = getDb();
  if (!db) return sheetCustomers;

  await ensureControlTables(db);

  const deletedRes = await db
    .prepare("SELECT customer_id FROM deleted_customers")
    .all<DeletedCustomerRow>();
  const deletedCustomerIds = new Set(deletedRes.results.map((row) => row.customer_id));

  const customerRes = await db
    .prepare(
      `SELECT * FROM customers
       WHERE customer_id NOT IN (SELECT customer_id FROM deleted_customers)
       ORDER BY submission_date DESC`,
    )
    .all<CustomerRow>();

  const noteRes = await db
    .prepare("SELECT * FROM customer_notes ORDER BY created_at DESC")
    .all<NoteRow>();

  const notesByCustomer = new Map<string, CustomerNote[]>();
  for (const row of noteRes.results) {
    const list = notesByCustomer.get(row.customer_id) ?? [];
    list.push(noteRowToNote(row));
    notesByCustomer.set(row.customer_id, list);
  }

  const dbCustomers = customerRes.results.map((row) =>
    rowToCustomer(row, notesByCustomer.get(row.customer_id) ?? []),
  );
  const merged = new Map<string, Customer>();

  for (const customer of dbCustomers) {
    merged.set(customer.customerId, customer);
  }

  for (const customer of sheetCustomers.filter((item) => !deletedCustomerIds.has(item.customerId))) {
    const existing = merged.get(customer.customerId);
    merged.set(customer.customerId, {
      ...customer,
      internalNotes: existing?.internalNotes.length ? existing.internalNotes : customer.internalNotes,
    });
  }

  return [...merged.values()].sort(
    (a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime(),
  );
}

async function writeAuditLog(
  db: D1Like,
  eventType: string,
  customerId: string,
  actor: PortalActor,
  details: Record<string, unknown>,
) {
  await ensureControlTables(db);

  await db
    .prepare(
      `INSERT INTO audit_logs (id, event_type, customer_id, actor_email, actor_role, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      eventType,
      customerId,
      actor.email,
      actor.role,
      JSON.stringify(details),
      new Date().toISOString(),
    )
    .run();
}

async function upsertCustomerSnapshot(db: D1Like, customer: Customer) {
  await db
    .prepare(
      `INSERT INTO customers (customer_id, first_name, last_name, phone_number, email, address, service_requested, lead_source, submission_date, assigned_staff, current_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(customer_id) DO UPDATE SET
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         phone_number = excluded.phone_number,
         email = excluded.email,
         address = excluded.address,
         service_requested = excluded.service_requested,
         lead_source = excluded.lead_source,
         submission_date = excluded.submission_date,
         assigned_staff = excluded.assigned_staff,
         current_status = excluded.current_status,
         updated_at = datetime('now')`,
    )
    .bind(
      customer.customerId,
      customer.firstName || "—",
      customer.lastName || "—",
      customer.phoneNumber || "—",
      customer.email || "—",
      customer.address || "—",
      customer.serviceRequested || "—",
      customer.leadSource || "Livablinds.com",
      customer.submissionDate || new Date().toISOString(),
      customer.assignedStaff || "Unassigned",
      customer.currentStatus,
    )
    .run();
}

export async function createLeadFromLivablinds(input: unknown): Promise<Customer> {
  const data = leadSchema.parse(input);
  const status: LeadStatus = isLeadStatus(data.currentStatus) ? data.currentStatus : "New Lead";
  const customerId = data.customerId || `SMD-${Date.now()}`;
  const submissionDate = data.submissionDate || new Date().toISOString();

  const customer: Customer = {
    customerId,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    email: data.email,
    address: data.address,
    serviceRequested: data.serviceRequested,
    leadSource: data.leadSource,
    submissionDate,
    assignedStaff: data.assignedStaff,
    currentStatus: status,
    internalNotes: [],
  };

  const db = getDb();
  if (!db) return customer;

  await db
    .prepare(
      `INSERT INTO customers (customer_id, first_name, last_name, phone_number, email, address, service_requested, lead_source, submission_date, assigned_staff, current_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      customerId,
      data.firstName,
      data.lastName,
      data.phoneNumber,
      data.email,
      data.address,
      data.serviceRequested,
      data.leadSource,
      submissionDate,
      data.assignedStaff,
      status,
    )
    .run();

  return customer;
}

export async function updateCustomerStatus(customerId: string, status: LeadStatus, snapshot?: Customer) {
  const db = getDb();
  if (!db) return { customerId, status };

  if (snapshot) {
    await upsertCustomerSnapshot(db, { ...snapshot, currentStatus: status });
  }

  const result = await db
    .prepare(
      "UPDATE customers SET current_status = ?, updated_at = datetime('now') WHERE customer_id = ?",
    )
    .bind(status, customerId)
    .run();

  if (result.meta.changes === 0) {
    throw new Error("Customer not found.");
  }

  return { customerId, status };
}

export async function deleteCustomer(customerId: string, actor: PortalActor) {
  const db = getDb();
  if (!db) {
    throw new Error("Database is not configured.");
  }

  await ensureControlTables(db);

  const existing = await db
    .prepare("SELECT * FROM customers WHERE customer_id = ?")
    .bind(customerId)
    .first<CustomerRow>();

  await writeAuditLog(db, "customer.deleted", customerId, actor, {
    customer: existing
      ? {
          customerId: existing.customer_id,
          firstName: existing.first_name,
          lastName: existing.last_name,
          email: existing.email,
          phoneNumber: existing.phone_number,
        }
      : null,
    source: existing ? "d1" : "sheet-or-external",
  });

  await db
    .prepare(
      `INSERT OR REPLACE INTO deleted_customers (customer_id, deleted_by_email, deleted_by_role, deleted_at, reason)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      customerId,
      actor.email,
      actor.role,
      new Date().toISOString(),
      "Owner deleted customer from Client Portal",
    )
    .run();

  await db.prepare("DELETE FROM customer_notes WHERE customer_id = ?").bind(customerId).run();
  await db.prepare("DELETE FROM customers WHERE customer_id = ?").bind(customerId).run();

  return { customerId, deleted: true };
}

export async function addCustomerNote(customerId: string, note: CustomerNote, snapshot?: Customer) {
  const db = getDb();
  if (!db) return note;

  if (snapshot) {
    await upsertCustomerSnapshot(db, snapshot);
  }

  const exists = await db
    .prepare("SELECT customer_id FROM customers WHERE customer_id = ?")
    .bind(customerId)
    .first<{ customer_id: string }>();

  if (!exists) {
    throw new Error("Customer not found.");
  }

  await db
    .prepare(
      "INSERT INTO customer_notes (id, customer_id, body, user_name, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(note.id, customerId, note.body, note.userName, note.timestamp)
    .run();

  await db
    .prepare("UPDATE customers SET updated_at = datetime('now') WHERE customer_id = ?")
    .bind(customerId)
    .run();

  return note;
}
