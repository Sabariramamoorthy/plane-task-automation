"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminInvoice = {
  id: string;
  invoiceMonth: string;
  amountUsd: number;
  totalRequests: number;
  totalEstimatedTokens: number;
  isPaid: boolean;
  paidAt: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
  };
};

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function safeJson(response: Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as {
        success?: boolean;
        data?: AdminInvoice[];
        error?: string;
      };
    } catch {
      return null;
    }
  }

  async function loadInvoices(options?: { keepLoadingState?: boolean }) {
    if (options?.keepLoadingState !== true) {
      setLoading(true);
    }
    setError(null);
    const response = await fetch("/api/admin/billing/invoices");
    const json = await safeJson(response);

    if (!json?.success || !json.data) {
      setError(json?.error ?? "Unable to load admin invoices.");
      setLoading(false);
      return;
    }

    setInvoices(json.data);
    setLoading(false);
  }

  async function togglePaid(invoice: AdminInvoice) {
    setUpdatingId(invoice.id);
    await fetch(`/api/admin/billing/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !invoice.isPaid }),
    });
    await loadInvoices({ keepLoadingState: true });
    setUpdatingId(null);
  }

  useEffect(() => {
    void (async () => {
      setError(null);
      const response = await fetch("/api/admin/billing/invoices");
      const json = await safeJson(response);
      if (!json?.success || !json.data) {
        setError(json?.error ?? "Unable to load admin invoices.");
      } else {
        setInvoices(json.data);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-zinc-600">Loading admin billing...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin Billing</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Update invoice paid/unpaid status with a database flag.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All User Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!invoices.length ? (
            <p className="text-sm text-zinc-600">No invoices found.</p>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-zinc-200 p-4 text-sm"
              >
                <div>
                  <p className="font-medium">{invoice.customer.name}</p>
                  <p className="text-zinc-500">{invoice.customer.email}</p>
                  <p className="text-zinc-500">
                    Invoice {invoice.invoiceMonth} · ${invoice.amountUsd.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
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
