import { NextRequest } from "next/server";
import {
  getSessionUser,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers";
import { getOwnedInstance } from "@/lib/plane/instance-service";
import { syncInstanceData } from "@/lib/plane/sync-cache";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const instance = await getOwnedInstance(id, user.id);
  if (!instance) return notFound("Instance not found");

  try {
    const result = await syncInstanceData(id);
    return ok(result);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Sync failed");
  }
}
