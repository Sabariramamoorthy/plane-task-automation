import { getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import { getUserBillingOverview } from "@/lib/billing";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const overview = await getUserBillingOverview(sessionUser.id);
  return ok(overview);
}
