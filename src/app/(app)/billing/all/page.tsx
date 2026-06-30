import { Suspense } from "react";
import { getActiveSessionUser } from "@/lib/auth-session";
import { getUserBillingOverview } from "@/lib/billing";
import { formatBillingMonthLabel } from "@/lib/billing-month";
import { BillingMonthFilter } from "@/components/billing/BillingMonthFilter";
import { BILLING_BASE, billingAllPath } from "@/lib/billing-paths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingAllPage() {
  const user = await getActiveSessionUser();
  const data = user ? await getUserBillingOverview(user.id, { allMonths: true }) : null;

  if (!data) {
    return <p className="text-sm text-red-600">Unable to load billing data.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Usage & Billing</h1>
        <p className="mt-2 text-sm text-zinc-600">View all invoices across billing months.</p>
      </div>

      <Suspense fallback={<p className="text-sm text-zinc-500">Loading months...</p>}>
        <BillingMonthFilter
          months={data.availableMonths}
          selectedMonth={data.monthId}
          basePath={BILLING_BASE}
          allMonthsPath={billingAllPath()}
          view="all"
        />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>All invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data.invoices.length ? (
            <p className="text-sm text-zinc-600">No invoices yet.</p>
          ) : (
            data.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    Invoice {invoice.invoiceMonth} · {formatBillingMonthLabel(invoice.invoiceMonth)}
                  </p>
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
