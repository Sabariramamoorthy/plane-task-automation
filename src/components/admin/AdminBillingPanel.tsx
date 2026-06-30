"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBillingMonthLabel } from "@/lib/billing-month";
import {
  ADMIN_BILLING_BASE,
  adminBillingAllPath,
} from "@/lib/billing-paths";
import { BillingMonthFilter } from "@/components/billing/BillingMonthFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type AdminUser = {
  id: string;
  name: string;
  email: string;
};

type AdminInvoice = {
  id: string;
  invoiceMonth: string;
  amountUsd: number;
  amountInr: number;
  totalRequests: number;
  totalEstimatedTokens: number;
  isPaid: boolean;
  paidAt: string | null;
  customer: AdminUser;
};

type AdminBillingPayload = {
  invoices: AdminInvoice[];
  users: AdminUser[];
  months: string[];
  selectedMonth: string;
};

type AdminBillingPanelProps = {
  view: "month" | "all";
  monthId?: string;
};

export function AdminBillingPanel({ view, monthId }: AdminBillingPanelProps) {
  const filterMonth = view === "month" ? monthId : undefined;

  const [data, setData] = useState<AdminBillingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [createMonth, setCreateMonth] = useState(monthId ?? "");
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    const query = filterMonth ? `?month=${encodeURIComponent(filterMonth)}` : "";
    const response = await fetch(`/api/admin/billing/invoices${query}`);
    const json = (await response.json()) as {
      success?: boolean;
      data?: AdminBillingPayload;
      error?: string;
    };

    if (!json.success || !json.data) {
      setError(json.error ?? "Unable to load admin billing.");
      setLoading(false);
      return;
    }

    setData(json.data);
    setSelectedUserId((current) => current || json.data?.users[0]?.id || "");
    setCreateMonth((current) => current || json.data?.selectedMonth || "");
    setLoading(false);
  }, [filterMonth]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  async function createInvoice() {
    const invoiceMonth = view === "month" ? data?.selectedMonth : createMonth;
    if (!selectedUserId || !invoiceMonth) return;

    setCreating(true);
    setCreateMessage(null);

    const response = await fetch("/api/admin/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        invoiceMonth,
      }),
    });

    const json = (await response.json()) as {
      success?: boolean;
      data?: { unchanged?: boolean; created?: boolean; updated?: boolean };
      error?: string;
    };

    setCreating(false);

    if (!json.success) {
      setCreateMessage(json.error ?? "Failed to create invoice.");
      return;
    }

    if (json.data?.unchanged) {
      setCreateMessage("Invoice already exists with the same usage values.");
    } else if (json.data?.created) {
      setCreateMessage("Invoice created.");
    } else if (json.data?.updated) {
      setCreateMessage("Invoice updated with latest usage.");
    } else {
      setCreateMessage("Invoice saved.");
    }

    await loadData();
  }

  async function togglePaid(invoice: AdminInvoice) {
    setUpdatingId(invoice.id);
    await fetch(`/api/admin/billing/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !invoice.isPaid }),
    });
    await loadData();
    setUpdatingId(null);
  }

  if (loading) return <p className="text-sm text-zinc-600">Loading admin billing...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const listTitle =
    view === "all"
      ? "All invoices"
      : `Invoices — ${formatBillingMonthLabel(data.selectedMonth)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin Billing</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Filter by month, generate invoices per user, and manage paid status.
        </p>
      </div>

      <BillingMonthFilter
        months={data.months}
        selectedMonth={data.selectedMonth}
        basePath={ADMIN_BILLING_BASE}
        allMonthsPath={adminBillingAllPath()}
        view={view}
      />

      <Card>
        <CardHeader>
          <CardTitle>Create invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {view === "all" ? (
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <Label htmlFor="create-invoice-month">Invoice month</Label>
              <select
                id="create-invoice-month"
                value={createMonth}
                onChange={(event) => setCreateMonth(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm sm:w-auto"
              >
                {data.months.map((id) => (
                  <option key={id} value={id}>
                    {formatBillingMonthLabel(id)} ({id})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <Label htmlFor="billing-user">User</Label>
            <select
              id="billing-user"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm sm:max-w-md"
            >
              {data.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={createInvoice} disabled={creating || !selectedUserId}>
              {creating
                ? "Creating..."
                : `Create invoice for ${formatBillingMonthLabel(view === "month" ? data.selectedMonth : createMonth)}`}
            </Button>
            {createMessage ? <p className="text-sm text-zinc-600">{createMessage}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{listTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data.invoices.length ? (
            <p className="text-sm text-zinc-600">
              {view === "all" ? "No invoices found." : "No invoices for this month."}
            </p>
          ) : (
            data.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-zinc-200 p-4 text-sm"
              >
                <div>
                  <p className="font-medium">{invoice.customer.name}</p>
                  <p className="text-zinc-500">{invoice.customer.email}</p>
                  <p className="text-zinc-500">
                    {invoice.invoiceMonth} · {invoice.totalRequests} requests ·{" "}
                    {invoice.totalEstimatedTokens} tokens
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">₹{invoice.amountInr.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500">${invoice.amountUsd.toFixed(4)}</p>
                  </div>
                  <span className={invoice.isPaid ? "text-emerald-700" : "text-amber-700"}>
                    {invoice.isPaid ? "Paid" : "Unpaid"}
                  </span>
                  <Button
                    variant="outline"
                    disabled={updatingId === invoice.id}
                    onClick={() => togglePaid(invoice)}
                  >
                    {updatingId === invoice.id
                      ? "Updating..."
                      : invoice.isPaid
                        ? "Mark Unpaid"
                        : "Mark Paid"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
