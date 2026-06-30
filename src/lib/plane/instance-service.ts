import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { planeInstances } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { createPlaneClient, type PlaneInstanceConfig } from "@/lib/plane/client";

export async function getOwnedInstance(instanceId: string, userId: string) {
  const [instance] = await db
    .select()
    .from(planeInstances)
    .where(eq(planeInstances.id, instanceId))
    .limit(1);

  if (!instance || instance.userId !== userId) {
    return null;
  }

  return instance;
}

export function toPlaneConfig(
  instance: typeof planeInstances.$inferSelect,
): PlaneInstanceConfig {
  if (!instance.apiKeyEncrypted) {
    throw new Error("No API key stored for this instance. Please add your API key and save.");
  }

  let apiKey: string;
  try {
    apiKey = decrypt(instance.apiKeyEncrypted);
  } catch {
    throw new Error(
      "Stored API key could not be decrypted. Re-enter your API key and save again.",
    );
  }

  return {
    baseUrl: instance.baseUrl,
    apiKey,
    workspaceSlug: instance.workspaceSlug,
    projectId: instance.projectId,
    defaultModuleId: instance.defaultModuleId,
    apiPathStyle: instance.apiPathStyle as "issues" | "work-items",
  };
}

export async function getPlaneClientForInstance(
  instanceId: string,
  userId: string,
) {
  const instance = await getOwnedInstance(instanceId, userId);
  if (!instance) return null;
  return {
    instance,
    client: createPlaneClient(toPlaneConfig(instance)),
  };
}

export function sanitizeInstance(
  instance: typeof planeInstances.$inferSelect,
) {
  return {
    id: instance.id,
    name: instance.name,
    baseUrl: instance.baseUrl,
    workspaceSlug: instance.workspaceSlug,
    projectId: instance.projectId,
    defaultModuleId: instance.defaultModuleId,
    apiPathStyle: instance.apiPathStyle,
    hasApiKey: Boolean(instance.apiKeyEncrypted),
    lastSyncedAt: instance.lastSyncedAt,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  };
}
