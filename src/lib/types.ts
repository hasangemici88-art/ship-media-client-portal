export const leadStatuses = [
  "New Lead",
  "Called",
  "Contacted",
  "Appointment Scheduled",
  "Quote Presented",
  "Sale Closed",
  "Lost Lead",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export type CustomerNote = {
  id: string;
  body: string;
  userName: string;
  timestamp: string;
};

export type Customer = {
  customerId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  address: string;
  serviceRequested: string;
  leadSource: string;
  submissionDate: string;
  assignedStaff: string;
  currentStatus: LeadStatus;
  internalNotes: CustomerNote[];
};

export type DashboardNotification = {
  id: string;
  type: "lead" | "status" | "sale";
  title: string;
  detail: string;
  timestamp: string;
};
