import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import {
  badRequest,
  getSessionUser,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { planeInstances } from "@/lib/db/schema";
import { instanceSettingsSchema } from "@/lib/schemas";
import {
  getOwnedInstance,
  sanitizeInstance,
} from "@/lib/plane/instance-service";
import {
  getCachedInstanceOptions,
  syncInstanceData,
} from "@/lib/plane/sync-cache";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const instance = await getOwnedInstance(id, user.id);
  if (!instance) return notFound("Instance not found");

  try {
    const forceSync = request.nextUrl.searchParams.get("sync") === "true";
    let options = await getCachedInstanceOptions(id);

    if (forceSync || options.isEmpty) {
      await syncInstanceData(id);
      options = await getCachedInstanceOptions(id);
    }

    return ok({
      instance: sanitizeInstance(instance),
      modules: options.modules,
      assignees: options.assignees,
      defaultModuleId: options.defaultModuleId,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to load instance data",
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const instance = await getOwnedInstance(id, user.id);
  if (!instance) return notFound("Instance not found");

  try {
    const body = await request.json();
    const parsed = instanceSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    if (!instance.apiKeyEncrypted && !parsed.data.apiKey) {
      return badRequest("API key is required");
    }

    const updateData: Partial<typeof planeInstances.$inferInsert> = {
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl.replace(/\/$/, ""),
      workspaceSlug: parsed.data.workspaceSlug,
      projectId: parsed.data.projectId,
      defaultModuleId: parsed.data.defaultModuleId,
      apiPathStyle: parsed.data.apiPathStyle,
      updatedAt: new Date(),
    };

    if (parsed.data.apiKey) {
      updateData.apiKeyEncrypted = encrypt(parsed.data.apiKey.trim());
    }

    const [updated] = await db
      .update(planeInstances)
      .set(updateData)
      .where(eq(planeInstances.id, id))
      .returning();

    return ok(sanitizeInstance(updated));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to update instance");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const instance = await getOwnedInstance(id, user.id);
  if (!instance) return notFound("Instance not found");

  await db.delete(planeInstances).where(eq(planeInstances.id, id));
  return ok({ deleted: true });
}
