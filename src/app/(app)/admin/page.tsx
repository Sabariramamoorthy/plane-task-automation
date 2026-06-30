"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AdminDashboardData = {
  stats: {
    totalUsers: number;
    totalInstances: number;
    totalIssues: number;
    totalInvoices: number;
    unpaidInvoices: number;
    totalInvoicedInr: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    instanceCount: number;
    monthlyRequestLimit: number;
    monthlyTokenLimit: number;
    isBillingEnabled: boolean;
    monthUsageRequests: number;
    monthUsageTokens: number;
    monthUsageInr: number;
  }>;
  invoices: Array<{
    id: string;
    userId: string;
    invoiceMonth: string;
    totalRequests: number;
    totalEstimatedTokens: number;
    isPaid: boolean;
    paidAt: string | null;
    amountInr: number;
    customer: {
      id: string;
      name: string;
      email: string;
    };
  }>;
};

type LimitDraft = {
  monthlyRequestLimit: number;
  monthlyTokenLimit: number;
  isBillingEnabled: boolean;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [togglingInvoiceId, setTogglingInvoiceId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LimitDraft>>({});

  async function safeJson(response: Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as {
        success?: boolean;
        data?: AdminDashboardData;
        error?: string;
      };
    } catch {
      return null;
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/dashboard");
    const json = await safeJson(response);
    if (!json?.success || !json.data) {
      setError(json?.error ?? "Failed to load admin dashboard");
      setLoading(false);
      return;
    }

    setData(json.data);
    setDrafts(
      Object.fromEntries(
        json.data.users.map((user) => [
          user.id,
          {
            monthlyRequestLimit: user.monthlyRequestLimit,
            monthlyTokenLimit: user.monthlyTokenLimit,
            isBillingEnabled: user.isBillingEnabled,
          },
        ]),
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/dashboard");
      const json = await safeJson(response);
      if (!json?.success || !json.data) {
        setError(json?.error ?? "Failed to load admin dashboard");
        setLoading(false);
        return;
      }

      setData(json.data);
      setDrafts(
        Object.fromEntries(
          json.data.users.map((user) => [
            user.id,
            {
              monthlyRequestLimit: user.monthlyRequestLimit,
              monthlyTokenLimit: user.monthlyTokenLimit,
              isBillingEnabled: user.isBillingEnabled,
            },
          ]),
        ),
      );
      setLoading(false);
    })();
  }, []);

  function updateDraft(userId: string, patch: Partial<LimitDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...patch,
      },
    }));
  }

  async function saveLimits(userId: string) {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingUserId(userId);
    await fetch(`/api/admin/users/${userId}/limits`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    await loadDashboard();
    setSavingUserId(null);
  }

  async function toggleUserStatus(userId: string, isActive: boolean) {
    setTogglingUserId(userId);
    await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await loadDashboard();
    setTogglingUserId(null);
  }

  async function toggleInvoice(invoiceId: string, isPaid: boolean) {
    setTogglingInvoiceId(invoiceId);
    await fetch(`/api/admin/billing/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !isPaid }),
    });
    await loadDashboard();
    setTogglingInvoiceId(null);
  }

  if (loading) return <p className="text-sm text-zinc-600">Loading admin dashboard...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-zinc-600">No data available.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Manage users, usage limits, billing status, and SaaS operations.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Users" value={data.stats.totalUsers} />
        <StatCard title="Instances" value={data.stats.totalInstances} />
        <StatCard title="Issues Created" value={data.stats.totalIssues} />
        <StatCard title="Invoices" value={data.stats.totalInvoices} />
        <StatCard title="Unpaid" value={data.stats.unpaidInvoices} />
        <StatCard title="Total Revenue (INR)" value={`₹${data.stats.totalInvoicedInr.toFixed(2)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management & Usage Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.users.map((item) => {
            const draft = drafts[item.id] ?? {
              monthlyRequestLimit: item.monthlyRequestLimit,
              monthlyTokenLimit: item.monthlyTokenLimit,
              isBillingEnabled: item.isBillingEnabled,
            };
            return (
              <div key={item.id} className="rounded-md border border-zinc-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.email}</p>
                    <p className="text-xs text-zinc-500">
                      Instances: {item.instanceCount}
                    </p>
                    <p
                      className={
                        item.isActive ? "text-xs text-emerald-700" : "text-xs text-red-600"
                      }
                    >
                      {item.isActive ? "Active" : "Deactivated"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => toggleUserStatus(item.id, item.isActive)}
                      disabled={togglingUserId === item.id}
                    >
                      {togglingUserId === item.id
                        ? "Updating..."
                        : item.isActive
                          ? "Deactivate"
                          : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => saveLimits(item.id)}
                      disabled={savingUserId === item.id}
                    >
                      {savingUserId === item.id ? "Saving..." : "Save Limits"}
                    </Button>
                  </div>
                </div>

                <div className="mb-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Monthly Requests</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.monthUsageRequests} / {item.monthlyRequestLimit}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Estimated Tokens</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.monthUsageTokens} / {item.monthlyTokenLimit}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Estimated Cost (INR)</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      ₹{item.monthUsageInr.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    type="number"
                    value={draft.monthlyRequestLimit}
                    onChange={(event) =>
                      updateDraft(item.id, {
                        monthlyRequestLimit: Number(event.target.value || 0),
                      })
                    }
                  />
                  <Input
                    type="number"
                    value={draft.monthlyTokenLimit}
                    onChange={(event) =>
                      updateDraft(item.id, {
                        monthlyTokenLimit: Number(event.target.value || 0),
                      })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={draft.isBillingEnabled}
                      onChange={(event) =>
                        updateDraft(item.id, { isBillingEnabled: event.target.checked })
                      }
                    />
                    Billing enabled
                  </label>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
              <div className="min-w-0">
                <p className="font-medium break-words">{invoice.customer.name}</p>
                <p className="break-all text-xs text-zinc-500">
                  {invoice.customer.email} · {invoice.invoiceMonth}
                </p>
                <p className="text-xs text-zinc-500">
                  {invoice.totalRequests} requests · {invoice.totalEstimatedTokens} tokens
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="font-semibold">₹{invoice.amountInr.toFixed(2)}</p>
                <span className={invoice.isPaid ? "text-emerald-700" : "text-amber-700"}>
                  {invoice.isPaid ? "Paid" : "Unpaid"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => toggleInvoice(invoice.id, invoice.isPaid)}
                  disabled={togglingInvoiceId === invoice.id}
                >
                  {togglingInvoiceId === invoice.id
                    ? "Updating..."
                    : invoice.isPaid
                      ? "Mark Unpaid"
                      : "Mark Paid"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-zinc-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
