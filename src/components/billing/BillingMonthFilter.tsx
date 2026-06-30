"use client";

import Link from "next/link";
import { formatBillingMonthLabel } from "@/lib/billing-month";
import { BillingMonthSelect } from "@/components/billing/BillingMonthSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BillingMonthFilterProps = {
  months: string[];
  selectedMonth: string;
  basePath: string;
  allMonthsPath?: string;
  view?: "month" | "all";
};

export function BillingMonthFilter({
  months,
  selectedMonth,
  basePath,
  allMonthsPath,
  view = "month",
}: BillingMonthFilterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter by month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {view === "month" ? (
          <BillingMonthSelect
            months={months}
            selectedMonth={selectedMonth}
            basePath={basePath}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {months.slice(0, 6).map((monthId) => (
            <Button
              key={monthId}
              variant={view === "month" && selectedMonth === monthId ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`${basePath}/${monthId}`}>{formatBillingMonthLabel(monthId)}</Link>
            </Button>
          ))}
          {allMonthsPath ? (
            <Button variant={view === "all" ? "default" : "outline"} size="sm" asChild>
              <Link href={allMonthsPath}>All months</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
