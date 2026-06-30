import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  badRequest,
  getSessionUser,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { planeInstances } from "@/lib/db/schema";
import { createInstanceSchema } from "@/lib/schemas";
import { sanitizeInstance } from "@/lib/plane/instance-service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const instances = await db
    .select()
    .from(planeInstances)
    .where(eq(planeInstances.userId, user.id));

  return ok(instances.map(sanitizeInstance));
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createInstanceSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const [instance] = await db
      .insert(planeInstances)
      .values({
        userId: user.id,
        name: parsed.data.name,
        baseUrl: parsed.data.baseUrl.replace(/\/$/, ""),
        apiKeyEncrypted: encrypt(parsed.data.apiKey.trim()),
        workspaceSlug: parsed.data.workspaceSlug,
        projectId: parsed.data.projectId,
        defaultModuleId: parsed.data.defaultModuleId,
        apiPathStyle: parsed.data.apiPathStyle,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: sanitizeInstance(instance) },
      { status: 201 },
    );
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to create instance");
  }
}
