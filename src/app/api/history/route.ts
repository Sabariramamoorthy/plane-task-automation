import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getSessionUser, ok, unauthorized } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { createdIssues, planeInstances, taskBatches } from "@/lib/db/schema";
import { sanitizeInstance } from "@/lib/plane/instance-service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const batches = await db
    .select({
      batch: taskBatches,
      instance: planeInstances,
    })
    .from(taskBatches)
    .innerJoin(planeInstances, eq(taskBatches.instanceId, planeInstances.id))
    .where(eq(taskBatches.userId, user.id))
    .orderBy(desc(taskBatches.createdAt))
    .limit(50);

  const issues = await db
    .select()
    .from(createdIssues)
    .where(eq(createdIssues.userId, user.id))
    .orderBy(desc(createdIssues.createdAt))
    .limit(100);

  return ok({
    batches: batches.map(({ batch, instance }) => ({
      ...batch,
      instance: sanitizeInstance(instance),
    })),
    issues,
  });
}
