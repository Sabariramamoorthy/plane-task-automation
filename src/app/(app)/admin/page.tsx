import { getAdminDashboardData } from "@/lib/admin-dashboard-service";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboard initialData={data} />;
}
