import { Suspense } from "react";
import { AdminBillingPanel } from "@/components/admin/AdminBillingPanel";

export default function AdminBillingAllPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">Loading admin billing...</p>}>
      <AdminBillingPanel view="all" />
    </Suspense>
  );
}
