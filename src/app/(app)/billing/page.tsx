import { redirect } from "next/navigation";
import { getBillingMonthRange, isValidBillingMonthId } from "@/lib/billing-month";
import { billingMonthPath } from "@/lib/billing-paths";

type BillingIndexPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function BillingIndexPage({ searchParams }: BillingIndexPageProps) {
  const { month } = await searchParams;

  if (month && isValidBillingMonthId(month)) {
    redirect(billingMonthPath(month));
  }

  const { monthId } = getBillingMonthRange();
  redirect(billingMonthPath(monthId));
}
