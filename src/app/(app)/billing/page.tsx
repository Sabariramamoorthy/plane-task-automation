import { getActiveSessionUser } from "@/lib/auth-session";
import { getUserBillingOverview } from "@/lib/billing";
import { GenerateInvoiceButton } from "@/components/billing/GenerateInvoiceButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingPage() {
  const user = await getActiveSessionUser();
  const data = user ? await getUserBillingOverview(user.id) : null;

  if (!data) {
    return <p className="text-sm text-red-600">Unable to load billing data.</p>;
  }

  const usagePct = Math.min(
    100,
    Math.round(
      (data.usage.totalEstimatedTokens / Math.max(1, data.usageLimit.monthlyTokenLimit)) * 100,
    ),
  );

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
              {data.usage.totalRequests} / {data.usageLimit.monthlyRequestLimit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {data.usage.totalEstimatedTokens} / {data.usageLimit.monthlyTokenLimit}
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
              ₹{data.usage.totalCostInr.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Invoices</CardTitle>
          <GenerateInvoiceButton />
        </CardHeader>
        <CardContent>
          {!data.invoices.length ? (
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
