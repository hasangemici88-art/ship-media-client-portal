import type { Session } from "next-auth";
import { Customer, customerAllowedStatuses, LeadStatus, UserRole } from "./types";

export type PortalActor = {
  email: string;
  name: string;
  role: UserRole;
};

export function actorFromSession(session: Session | null): PortalActor | null {
  const email = session?.user?.email?.toLowerCase().trim();
  const user = session?.user;
  if (!email) return null;

  return {
    email,
    name: user?.name || email,
    role: user?.role === "Customer" ? "Customer" : "Owner",
  };
}

export function isOwner(actor: PortalActor | null) {
  return actor?.role === "Owner";
}

export function canViewCustomer(actor: PortalActor, customer: Customer) {
  if (actor.role === "Owner") return true;

  const assignedStaff = customer.assignedStaff.toLowerCase().trim();
  return assignedStaff === actor.email || assignedStaff === actor.name.toLowerCase().trim();
}

export function canUpdateStatus(actor: PortalActor, status: LeadStatus) {
  if (actor.role === "Owner") return true;
  return customerAllowedStatuses.includes(status as (typeof customerAllowedStatuses)[number]);
}

export function canAddNotes(actor: PortalActor) {
  return actor.role === "Owner";
}

export function canDeleteCustomers(actor: PortalActor | null) {
  return actor?.role === "Owner";
}

export function visibleStatusesForRole(role: UserRole) {
  return role === "Owner" ? null : customerAllowedStatuses;
}
