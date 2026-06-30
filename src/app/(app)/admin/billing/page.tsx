import { redirect } from "next/navigation";
import { getBillingMonthRange, isValidBillingMonthId } from "@/lib/billing-month";
import { adminBillingMonthPath } from "@/lib/billing-paths";

type AdminBillingIndexPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function AdminBillingIndexPage({
  searchParams,
}: AdminBillingIndexPageProps) {
  const { month } = await searchParams;

  if (month && isValidBillingMonthId(month)) {
    redirect(adminBillingMonthPath(month));
  }

  const { monthId } = getBillingMonthRange();
  redirect(adminBillingMonthPath(monthId));
}
