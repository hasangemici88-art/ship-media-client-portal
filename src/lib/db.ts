import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { demoCustomers } from "./demo-data";
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

export async function getCustomers(): Promise<Customer[]> {
  const db = getDb();
  if (!db) return demoCustomers;

  const customerRes = await db
    .prepare("SELECT * FROM customers ORDER BY submission_date DESC")
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

  return customerRes.results.map((row) =>
    rowToCustomer(row, notesByCustomer.get(row.customer_id) ?? []),
  );
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

export async function updateCustomerStatus(customerId: string, status: LeadStatus) {
  const db = getDb();
  if (!db) return { customerId, status };

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

export async function addCustomerNote(customerId: string, note: CustomerNote) {
  const db = getDb();
  if (!db) return note;

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
