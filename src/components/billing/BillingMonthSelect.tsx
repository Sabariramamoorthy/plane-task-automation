"use client";

import { useRouter } from "next/navigation";
import { formatBillingMonthLabel } from "@/lib/billing-month";
import { Label } from "@/components/ui/label";

type BillingMonthSelectProps = {
  months: string[];
  selectedMonth: string;
  basePath: string;
};

export function BillingMonthSelect({
  months,
  selectedMonth,
  basePath,
}: BillingMonthSelectProps) {
  const router = useRouter();

  function onChange(monthId: string) {
    router.push(`${basePath}/${monthId}`);
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <Label htmlFor="billing-month">Billing month</Label>
      <select
        id="billing-month"
        value={selectedMonth}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm sm:w-auto"
      >
        {months.map((monthId) => (
          <option key={monthId} value={monthId}>
            {formatBillingMonthLabel(monthId)} ({monthId})
          </option>
        ))}
      </select>
    </div>
  );
}
