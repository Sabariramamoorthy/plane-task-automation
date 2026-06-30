import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isValidBillingMonthId } from "@/lib/billing-month";
import { AdminBillingPanel } from "@/components/admin/AdminBillingPanel";

type AdminBillingMonthPageProps = {
  params: Promise<{ month: string }>;
};

export default async function AdminBillingMonthPage({ params }: AdminBillingMonthPageProps) {
  const { month } = await params;
  if (!isValidBillingMonthId(month)) notFound();

  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">Loading admin billing...</p>}>
      <AdminBillingPanel view="month" monthId={month} />
    </Suspense>
  );
}
