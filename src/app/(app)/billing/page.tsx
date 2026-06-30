"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BillingOverview = {
  monthId: string;
  usageLimit: {
    monthlyRequestLimit: number;
    monthlyTokenLimit: number;
    isBillingEnabled: boolean;
  };
  usage: {
    totalRequests: number;
    totalEstimatedTokens: number;
    totalCostUsd: number;
    totalCostInr: number;
  };
  invoices: Array<{
    id: string;
    invoiceMonth: string;
    totalRequests: number;
    totalEstimatedTokens: number;
    amountUsd: number;
    amountInr: number;
    isPaid: boolean;
    paidAt: string | null;
    createdAt: string;
  }>;
};

export default function BillingPage() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function safeJson(response: Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as { success?: boolean; data?: BillingOverview; error?: string };
    } catch {
      return null;
    }
  }

  async function loadBilling(options?: { keepLoadingState?: boolean }) {
    if (options?.keepLoadingState !== true) {
      setLoading(true);
    }
    setError(null);
    const response = await fetch("/api/billing");
    const json = await safeJson(response);
    if (!json?.success || !json.data) {
      setError(json?.error ?? "Unable to load billing right now.");
      setData(null);
    } else {
      setData(json.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      setError(null);
      const response = await fetch("/api/billing");
      const json = await safeJson(response);
      if (!json?.success || !json.data) {
        setError(json?.error ?? "Unable to load billing right now.");
        setData(null);
      } else {
        setData(json.data);
      }
      setLoading(false);
    })();
  }, []);

  const usagePct = useMemo(() => {
    if (!data) return 0;
    return Math.min(
      100,
      Math.round((data.usage.totalEstimatedTokens / Math.max(1, data.usageLimit.monthlyTokenLimit)) * 100),
    );
  }, [data]);

  async function generateInvoice() {
    setGenerating(true);
    await fetch("/api/billing/invoices", { method: "POST" });
    await loadBilling({ keepLoadingState: true });
    setGenerating(false);
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading billing data...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Usage & Billing</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Track usage limits, monthly consumption, and your invoices.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {data?.usage.totalRequests ?? 0} / {data?.usageLimit.monthlyRequestLimit ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {data?.usage.totalEstimatedTokens ?? 0} / {data?.usageLimit.monthlyTokenLimit ?? 0}
            </p>
            <div className="mt-3 h-2 rounded bg-zinc-200">
              <div className="h-2 rounded bg-zinc-900" style={{ width: `${usagePct}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated Cost (INR)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              ₹{(data?.usage.totalCostInr ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button
            onClick={generateInvoice}
            disabled={generating}
            className="w-full sm:w-auto"
          >
            {generating ? "Generating..." : "Generate This Month Invoice"}
          </Button>
        </CardHeader>
        <CardContent>
          {!data?.invoices.length ? (
            <p className="text-sm text-zinc-600">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {data.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">Invoice {invoice.invoiceMonth}</p>
                    <p className="text-zinc-500">
                      Requests: {invoice.totalRequests} · Tokens: {invoice.totalEstimatedTokens}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{invoice.amountInr.toFixed(2)}</p>
                    <p className={invoice.isPaid ? "text-emerald-700" : "text-amber-700"}>
                      {invoice.isPaid ? "Paid" : "Unpaid"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
