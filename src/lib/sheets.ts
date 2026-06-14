import { google } from "googleapis";
import { z } from "zod";
import { demoCustomers } from "./demo-data";
import { Customer, CustomerNote, LeadStatus } from "./types";
import { isLeadStatus, parseNotes, serializeNotes } from "./utils";

const sheetName = process.env.GOOGLE_SHEETS_TAB_NAME || "Leads";
const spreadsheetId =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
  "1qvRKCRNOrigNoUKHPWWstnmxQtOdvVG50zvt4TXwWqA";
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

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

const headers = [
  "Customer ID",
  "First Name",
  "Last Name",
  "Phone Number",
  "Email",
  "Address",
  "Service Requested",
  "Lead Source",
  "Submission Date",
  "Assigned Staff",
  "Current Status",
  "Internal Notes",
];

function sheetsEnabled() {
  return Boolean(spreadsheetId && serviceAccountEmail && privateKey);
}

async function getSheetsClient() {
  if (!sheetsEnabled()) {
    throw new Error("Google Sheets credentials are not configured.");
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function rowToCustomer(row: string[]): Customer {
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
    internalNotes: parseNotes(row[11]),
  };
}

function customerToRow(customer: Customer) {
  return [
    customer.customerId,
    customer.firstName,
    customer.lastName,
    customer.phoneNumber,
    customer.email,
    customer.address,
    customer.serviceRequested,
    customer.leadSource,
    customer.submissionDate,
    customer.assignedStaff,
    customer.currentStatus,
    serializeNotes(customer.internalNotes),
  ];
}

async function ensureHeaders() {
  const sheets = await getSheetsClient();
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:L1`,
  });

  if (!current.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:L1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

export async function getCustomers(): Promise<Customer[]> {
  if (!sheetsEnabled()) {
    return demoCustomers;
  }

  await ensureHeaders();
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:L`,
  });

  return (response.data.values || [])
    .filter((row) => row.some(Boolean))
    .map((row) => rowToCustomer(row as string[]));
}

export async function createLeadFromLivablinds(input: unknown) {
  const data = leadSchema.parse(input);
  const status = isLeadStatus(data.currentStatus) ? data.currentStatus : "New Lead";
  const customer: Customer = {
    customerId: data.customerId || `SMD-${Date.now()}`,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    email: data.email,
    address: data.address,
    serviceRequested: data.serviceRequested,
    leadSource: data.leadSource,
    submissionDate: data.submissionDate || new Date().toISOString(),
    assignedStaff: data.assignedStaff,
    currentStatus: status,
    internalNotes: [],
  };

  if (!sheetsEnabled()) {
    return customer;
  }

  await ensureHeaders();
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:L`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [customerToRow(customer)] },
  });

  return customer;
}

async function findRowNumber(customerId: string) {
  const customers = await getCustomers();
  const index = customers.findIndex((customer) => customer.customerId === customerId);

  if (index === -1) {
    throw new Error("Customer not found.");
  }

  return index + 2;
}

export async function updateCustomerStatus(customerId: string, status: LeadStatus) {
  if (!sheetsEnabled()) {
    return { customerId, status };
  }

  const rowNumber = await findRowNumber(customerId);
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!K${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[status]] },
  });

  return { customerId, status };
}

export async function addCustomerNote(customerId: string, note: CustomerNote) {
  if (!sheetsEnabled()) {
    return note;
  }

  const customers = await getCustomers();
  const customer = customers.find((item) => item.customerId === customerId);
  if (!customer) {
    throw new Error("Customer not found.");
  }

  const rowNumber = customers.findIndex((item) => item.customerId === customerId) + 2;
  const notes = [note, ...customer.internalNotes];
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!L${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[serializeNotes(notes)]] },
  });

  return note;
}
