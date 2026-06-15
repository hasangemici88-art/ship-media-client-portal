"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  LogOut,
  Moon,
  Search,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { demoNotifications } from "@/lib/demo-data";
import { Customer, CustomerNote, LeadStatus, leadStatuses } from "@/lib/types";
import { cn, customerFullName, formatDate, formatDateTime } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

const statusClasses: Record<LeadStatus, string> = {
  "New Lead": "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20",
  Called:
    "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-400/20",
  Contacted:
    "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-400/20",
  "Appointment Scheduled":
    "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/20",
  "Quote Presented":
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/20",
  "Sale Closed":
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20",
  "Lost Lead":
    "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/20",
};

const funnelColors = ["#38bdf8", "#818cf8", "#22d3ee", "#a78bfa", "#f59e0b", "#10b981"];

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusClasses[status])}>
      {status}
    </span>
  );
}

function getMonthlyLeads(customers: Customer[]) {
  const grouped = customers.reduce<Record<string, number>>((acc, customer) => {
    const date = new Date(customer.submissionDate);
    const key = Number.isNaN(date.getTime())
      ? "Unknown"
      : new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([month, leads]) => ({ month, leads }));
}

function buildNotifications(customers: Customer[]) {
  const newest = customers
    .slice()
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
    .slice(0, 2)
    .map((customer) => ({
      id: `lead-${customer.customerId}`,
      type: "lead" as const,
      title: "New lead captured",
      detail: `${customerFullName(customer)} requested ${customer.serviceRequested}.`,
      timestamp: customer.submissionDate,
    }));

  const closed = customers
    .filter((customer) => customer.currentStatus === "Sale Closed")
    .slice(0, 1)
    .map((customer) => ({
      id: `sale-${customer.customerId}`,
      type: "sale" as const,
      title: "Sale closed",
      detail: `${customerFullName(customer)} is now marked closed.`,
      timestamp: customer.submissionDate,
    }));

  return [...newest, ...closed, ...demoNotifications].slice(0, 4);
}

export function ClientPortalDashboard({ userName }: { userName: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await fetch("/api/customers");
        if (!response.ok) throw new Error("Could not load customers.");
        const data = (await response.json()) as { customers: Customer[] };
        setCustomers(data.customers);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load customers.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const lowerQuery = query.toLowerCase();

    return customers.filter((customer) => {
      const searchable = [
        customer.customerId,
        customer.firstName,
        customer.lastName,
        customer.phoneNumber,
        customer.email,
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchable.includes(lowerQuery) &&
        (statusFilter === "All" || customer.currentStatus === statusFilter)
      );
    });
  }, [customers, query, statusFilter]);

  const kpis = useMemo(() => {
    const count = (status: LeadStatus) =>
      customers.filter((customer) => customer.currentStatus === status).length;

    return [
      { label: "Total Leads", value: customers.length, icon: UserRound },
      { label: "Called", value: count("Called"), icon: Bell },
      { label: "Contacted", value: count("Contacted"), icon: CheckCircle2 },
      { label: "Appointments", value: count("Appointment Scheduled"), icon: ChevronRight },
      { label: "Quotes Sent", value: count("Quote Presented"), icon: CircleDollarSign },
      { label: "Sales Closed", value: count("Sale Closed"), icon: CheckCircle2 },
    ];
  }, [customers]);

  const conversionRate = customers.length
    ? Math.round((customers.filter((customer) => customer.currentStatus === "Sale Closed").length / customers.length) * 100)
    : 0;

  const funnelData = [
    { name: "New", value: customers.length },
    { name: "Called", value: customers.filter((customer) => customer.currentStatus !== "New Lead").length },
    {
      name: "Contacted",
      value: customers.filter((customer) =>
        ["Contacted", "Appointment Scheduled", "Quote Presented", "Sale Closed"].includes(customer.currentStatus),
      ).length,
    },
    {
      name: "Appointments",
      value: customers.filter((customer) =>
        ["Appointment Scheduled", "Quote Presented", "Sale Closed"].includes(customer.currentStatus),
      ).length,
    },
    {
      name: "Quotes",
      value: customers.filter((customer) => ["Quote Presented", "Sale Closed"].includes(customer.currentStatus)).length,
    },
    { name: "Closed", value: customers.filter((customer) => customer.currentStatus === "Sale Closed").length },
  ];

  function updateCustomerLocally(customerId: string, updates: Partial<Customer>) {
    setCustomers((current) =>
      current.map((customer) =>
        customer.customerId === customerId ? { ...customer, ...updates } : customer,
      ),
    );
    setSelectedCustomer((current) =>
      current?.customerId === customerId ? { ...current, ...updates } : current,
    );
  }

  async function updateStatus(customer: Customer, status: LeadStatus) {
    updateCustomerLocally(customer.customerId, { currentStatus: status });
    const response = await fetch(`/api/customers/${customer.customerId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setError("Status could not be synchronized. Please retry.");
    }
  }

  async function addNote(customer: Customer, body: string) {
    const optimisticNote: CustomerNote = {
      id: crypto.randomUUID(),
      body,
      userName,
      timestamp: new Date().toISOString(),
    };
    updateCustomerLocally(customer.customerId, {
      internalNotes: [optimisticNote, ...customer.internalNotes],
    });

    const response = await fetch(`/api/customers/${customer.customerId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      setError("Note could not be synchronized. Please retry.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-950 font-black text-white dark:bg-sky-500">
              S
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
                Ship Media Digital
              </p>
              <h1 className="font-semibold">Client Portal</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/10"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-sky-600 dark:text-sky-300">Livablinds CRM</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">Customer management dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Search leads, track the pipeline, update status, and save internal notes — synced live.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900">
            <span className="text-slate-500 dark:text-slate-400">Signed in as </span>
            <strong>{userName}</strong>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {kpis.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                <Icon size={17} className="text-sky-500" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Monthly Leads</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Live from Sheet</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getMonthlyLeads(customers)}>
                  <defs>
                    <linearGradient id="leadFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="leads" stroke="#0284c7" fill="url(#leadFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <h3 className="font-semibold">Lead Conversion Rate</h3>
            <div className="mt-6 flex items-end gap-3">
              <p className="text-6xl font-semibold tracking-tight">{conversionRate}%</p>
              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">closed sales</p>
            </div>
            <div className="mt-6 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData.slice(-3)}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <h3 className="font-semibold">Sales Funnel</h3>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} nameKey="name">
                    {funnelData.map((entry, index) => (
                      <Cell key={entry.name} fill={funnelColors[index % funnelColors.length]} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="grid gap-3 border-b border-slate-200 p-4 dark:border-white/10 lg:grid-cols-[1fr_260px]">
              <label>
                <span className="mb-2 block text-sm font-semibold">Search Customer</span>
                <span className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-white/10 dark:bg-slate-950">
                  <Search size={18} className="text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Name, phone, email, or customer ID"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </span>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">Lead Status</span>
                <select
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-950"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "All")}
                >
                  <option value="All">All Statuses</option>
                  {leadStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error ? <div className="border-b border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    {["Customer Name", "Phone", "Email", "Submission Date", "Service", "Assigned Staff", "Current Status", ""].map(
                      (heading) => (
                        <th key={heading} className="px-4 py-3 font-semibold">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                        Loading customers...
                      </td>
                    </tr>
                  ) : null}
                  {!loading && filteredCustomers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                        No customers match the current search.
                      </td>
                    </tr>
                  ) : null}
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.customerId} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-4 font-semibold">{customerFullName(customer)}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{customer.phoneNumber}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{customer.email}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(customer.submissionDate)}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{customer.serviceRequested}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{customer.assignedStaff}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={customer.currentStatus} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold transition hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:hover:border-sky-400 dark:hover:text-sky-200"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          View Customer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <Bell size={17} className="text-sky-500" />
            </div>
            <div className="space-y-3">
              {buildNotifications(customers).map((notification) => (
                <div key={notification.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950">
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.detail}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(notification.timestamp)}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>

      {selectedCustomer ? (
        <CustomerDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onStatusChange={updateStatus}
          onAddNote={addNote}
        />
      ) : null}
    </main>
  );
}

function CustomerDrawer({
  customer,
  onClose,
  onStatusChange,
  onAddNote,
}: {
  customer: Customer;
  onClose: () => void;
  onStatusChange: (customer: Customer, status: LeadStatus) => Promise<void>;
  onAddNote: (customer: Customer, body: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<LeadStatus>(customer.currentStatus);
  const [note, setNote] = useState("");

  useEffect(() => {
    setStatus(customer.currentStatus);
  }, [customer.currentStatus]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">{customer.customerId}</p>
            <h3 className="mt-1 text-2xl font-semibold">{customerFullName(customer)}</h3>
          </div>
          <button
            className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label="Close customer panel"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <h4 className="mb-4 font-semibold">Customer Information</h4>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["Full Name", customerFullName(customer)],
                ["Phone", customer.phoneNumber],
                ["Email", customer.email],
                ["Address", customer.address],
                ["Service Requested", customer.serviceRequested],
              ].map(([label, value]) => (
                <div key={label} className={label === "Address" ? "sm:col-span-2" : ""}>
                  <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <h4 className="mb-4 font-semibold">Lead Information</h4>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Lead Source</dt>
                <dd className="mt-1 font-medium">{customer.leadSource}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Date Submitted</dt>
                <dd className="mt-1 font-medium">{formatDate(customer.submissionDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Assigned Team Member</dt>
                <dd className="mt-1 font-medium">{customer.assignedStaff}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Current Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={customer.currentStatus} />
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <h4 className="mb-4 font-semibold">Status Management</h4>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900"
                value={status}
                onChange={(event) => setStatus(event.target.value as LeadStatus)}
              >
                {leadStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
                onClick={() => onStatusChange(customer, status)}
              >
                Update
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <h4 className="mb-4 font-semibold">Internal Notes</h4>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!note.trim()) return;
                onAddNote(customer, note.trim());
                setNote("");
              }}
            >
              <textarea
                className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-slate-900"
                placeholder="Add an internal note..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-500">
                Save Note
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {customer.internalNotes.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  No notes yet.
                </p>
              ) : null}
              {customer.internalNotes.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900">
                  <p className="text-sm leading-6">{item.body}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {item.userName} · {formatDateTime(item.timestamp)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
