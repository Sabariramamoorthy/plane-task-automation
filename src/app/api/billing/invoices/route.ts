import { getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import { createOrUpdateCurrentInvoice } from "@/lib/billing";

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const invoice = await createOrUpdateCurrentInvoice(sessionUser.id);
  return ok(invoice);
}
