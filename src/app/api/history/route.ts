import { getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import { getHistoryForUser } from "@/lib/history-service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const data = await getHistoryForUser(user.id);
  return ok(data);
}
