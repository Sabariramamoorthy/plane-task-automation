import { eq } from "drizzle-orm";
import { badRequest, getSessionUser, notFound, ok, unauthorized } from "@/lib/api-helpers";
import { isUserAdmin } from "@/lib/billing";
import { db } from "@/lib/db";
import { user, userUsageLimits } from "@/lib/db/schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const canAdmin = await isUserAdmin(sessionUser.id, sessionUser.email);
  if (!canAdmin) return unauthorized();

  const body = (await request.json()) as {
    monthlyRequestLimit?: number;
    monthlyTokenLimit?: number;
    isBillingEnabled?: boolean;
  };

  if (
    typeof body.monthlyRequestLimit !== "number" ||
    typeof body.monthlyTokenLimit !== "number" ||
    typeof body.isBillingEnabled !== "boolean"
  ) {
    return badRequest(
      "monthlyRequestLimit, monthlyTokenLimit, and isBillingEnabled are required",
    );
  }

  const { id } = await context.params;
  const existingUser = await db.query.user.findFirst({
    where: eq(user.id, id),
  });
  if (!existingUser) return notFound("User not found");

  const existingLimit = await db.query.userUsageLimits.findFirst({
    where: eq(userUsageLimits.userId, id),
  });

  if (!existingLimit) {
    const [created] = await db
      .insert(userUsageLimits)
      .values({
        userId: id,
        monthlyRequestLimit: body.monthlyRequestLimit,
        monthlyTokenLimit: body.monthlyTokenLimit,
        isBillingEnabled: body.isBillingEnabled,
      })
      .returning();
    return ok(created);
  }

  const [updated] = await db
    .update(userUsageLimits)
    .set({
      monthlyRequestLimit: body.monthlyRequestLimit,
      monthlyTokenLimit: body.monthlyTokenLimit,
      isBillingEnabled: body.isBillingEnabled,
      updatedAt: new Date(),
    })
    .where(eq(userUsageLimits.userId, id))
    .returning();

  return ok(updated);
}
