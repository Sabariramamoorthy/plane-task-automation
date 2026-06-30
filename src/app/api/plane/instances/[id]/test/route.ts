import { NextRequest } from "next/server";
import {
  getSessionUser,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers";
import {
  getPlaneClientForInstance,
  sanitizeInstance,
} from "@/lib/plane/instance-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const plane = await getPlaneClientForInstance(id, user.id);
  if (!plane) return notFound("Instance not found");

  try {
    const result = await plane.client.testConnection();
    return ok({
      instance: sanitizeInstance(plane.instance),
      ...result,
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Connection failed");
  }
}
