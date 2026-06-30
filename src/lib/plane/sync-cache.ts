import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  planeAssignees,
  planeInstances,
  planeModules,
} from "@/lib/db/schema";
import { createPlaneClient } from "@/lib/plane/client";
import { toPlaneConfig } from "@/lib/plane/instance-service";

export async function syncInstanceData(instanceId: string) {
  const [instance] = await db
    .select()
    .from(planeInstances)
    .where(eq(planeInstances.id, instanceId))
    .limit(1);

  if (!instance) {
    throw new Error("Instance not found");
  }

  const client = createPlaneClient(toPlaneConfig(instance));

  const [modules, assignees] = await Promise.all([
    client.syncModules(),
    client.syncAssignees(),
  ]);

  await db.delete(planeModules).where(eq(planeModules.instanceId, instanceId));
  await db.delete(planeAssignees).where(eq(planeAssignees.instanceId, instanceId));

  if (modules.length > 0) {
    await db.insert(planeModules).values(
      modules.map((module) => ({
        instanceId,
        planeModuleId: module.id,
        name: module.name,
        status: module.status,
      })),
    );
  }

  if (assignees.length > 0) {
    await db.insert(planeAssignees).values(
      assignees.map((assignee) => ({
        instanceId,
        planeMemberId: assignee.member_id,
        planeUserId: assignee.id,
        displayName: assignee.display_name,
        email: assignee.email,
        avatarUrl: assignee.avatar,
      })),
    );
  }

  await db
    .update(planeInstances)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(planeInstances.id, instanceId));

  return {
    modules: modules.length,
    assignees: assignees.length,
    syncedAt: new Date().toISOString(),
  };
}

export async function getCachedInstanceOptions(instanceId: string) {
  const [modules, assignees, instance] = await Promise.all([
    db.select().from(planeModules).where(eq(planeModules.instanceId, instanceId)),
    db.select().from(planeAssignees).where(eq(planeAssignees.instanceId, instanceId)),
    db
      .select()
      .from(planeInstances)
      .where(eq(planeInstances.id, instanceId))
      .limit(1),
  ]);

  const moduleOptions = modules.map((module) => ({
    id: module.planeModuleId,
    name: module.name,
  }));

  const assigneeOptions = assignees.map((assignee) => ({
    id: assignee.planeUserId,
    name: assignee.displayName,
  }));

  const defaultModuleId = instance[0]?.defaultModuleId;
  if (
    defaultModuleId &&
    !moduleOptions.some((module) => module.id === defaultModuleId)
  ) {
    moduleOptions.unshift({
      id: defaultModuleId,
      name: "Default module",
    });
  }

  return {
    modules: moduleOptions,
    assignees: assigneeOptions,
    defaultModuleId,
    isEmpty: moduleOptions.length === 0 && assigneeOptions.length === 0,
  };
}
