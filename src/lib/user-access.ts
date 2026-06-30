import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { session, user } from "@/lib/db/schema";

export async function isUserActive(userId: string) {
  const row = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { isActive: true },
  });
  return row?.isActive ?? false;
}

export async function revokeUserSessions(userId: string) {
  await db.delete(session).where(eq(session.userId, userId));
}

export async function setUserActive(userId: string, isActive: boolean) {
  const [updated] = await db
    .update(user)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning();

  if (!updated) return null;

  if (!isActive) {
    await revokeUserSessions(userId);
  }

  return updated;
}
