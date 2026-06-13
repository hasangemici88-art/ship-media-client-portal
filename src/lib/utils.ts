import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Customer, CustomerNote, LeadStatus, leadStatuses } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLeadStatus(value: string): value is LeadStatus {
  return leadStatuses.includes(value as LeadStatus);
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function parseNotes(value: unknown): CustomerNote[] {
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (note): note is CustomerNote =>
          typeof note?.id === "string" &&
          typeof note?.body === "string" &&
          typeof note?.userName === "string" &&
          typeof note?.timestamp === "string",
      );
    }
  } catch {
    return value
      .split("\n")
      .filter(Boolean)
      .map((body, index) => ({
        id: `legacy-${index}`,
        body,
        userName: "Imported",
        timestamp: new Date().toISOString(),
      }));
  }

  return [];
}

export function serializeNotes(notes: CustomerNote[]) {
  return JSON.stringify(notes);
}

export function customerFullName(customer: Customer) {
  return `${customer.firstName} ${customer.lastName}`.trim();
}
