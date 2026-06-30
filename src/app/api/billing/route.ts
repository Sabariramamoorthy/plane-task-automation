import { getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import { getUserBillingOverview } from "@/lib/billing";
import { isValidBillingMonthId } from "@/lib/billing-month";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const monthId = month && isValidBillingMonthId(month) ? month : undefined;

  const overview = await getUserBillingOverview(sessionUser.id, { monthId });
  return ok(overview);
}
