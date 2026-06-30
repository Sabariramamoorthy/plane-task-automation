import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { createdIssues, planeInstances, taskBatches } from "@/lib/db/schema";
import { sanitizeInstance } from "@/lib/plane/instance-service";

export async function getHistoryForUser(userId: string) {
  const [batches, issues] = await Promise.all([
    db
      .select({
        batch: taskBatches,
        instance: planeInstances,
      })
      .from(taskBatches)
      .innerJoin(planeInstances, eq(taskBatches.instanceId, planeInstances.id))
      .where(eq(taskBatches.userId, userId))
      .orderBy(desc(taskBatches.createdAt))
      .limit(50),
    db
      .select({
        id: createdIssues.id,
        taskName: createdIssues.taskName,
        planeUrl: createdIssues.planeUrl,
        error: createdIssues.error,
        createdAt: createdIssues.createdAt,
      })
      .from(createdIssues)
      .where(eq(createdIssues.userId, userId))
      .orderBy(desc(createdIssues.createdAt))
      .limit(100),
  ]);

  return {
    batches: batches.map(({ batch, instance }) => ({
      id: batch.id,
      rawInput: batch.rawInput,
      status: batch.status,
      createdAt: batch.createdAt.toISOString(),
      instance: { name: sanitizeInstance(instance).name },
    })),
    issues: issues.map((issue) => ({
      ...issue,
      createdAt: issue.createdAt.toISOString(),
    })),
  };
}
