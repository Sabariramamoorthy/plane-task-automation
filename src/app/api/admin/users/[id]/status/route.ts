import { badRequest, getSessionUser, notFound, ok, unauthorized } from "@/lib/api-helpers";
import { isUserAdmin } from "@/lib/billing";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { setUserActive } from "@/lib/user-access";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const canAdmin = await isUserAdmin(sessionUser.id, sessionUser.email);
  if (!canAdmin) return unauthorized();

  const body = (await request.json()) as { isActive?: boolean };
  if (typeof body.isActive !== "boolean") {
    return badRequest("isActive boolean is required");
  }

  const { id } = await context.params;
  if (id === sessionUser.id && !body.isActive) {
    return badRequest("You cannot deactivate your own account");
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(user.id, id),
  });
  if (!existingUser) return notFound("User not found");

  const updated = await setUserActive(id, body.isActive);
  if (!updated) return notFound("User not found");

  return ok({
    id: updated.id,
    email: updated.email,
    isActive: updated.isActive,
  });
}
