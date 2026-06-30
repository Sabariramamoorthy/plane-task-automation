import { getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import { isUserAdmin } from "@/lib/billing";
import { getAdminDashboardData } from "@/lib/admin-dashboard-service";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const canAdmin = await isUserAdmin(sessionUser.id, sessionUser.email);
  if (!canAdmin) return unauthorized();

  const data = await getAdminDashboardData();
  return ok(data);
}
