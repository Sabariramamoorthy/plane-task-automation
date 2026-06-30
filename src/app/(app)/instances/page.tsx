import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { planeInstances } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeInstance } from "@/lib/plane/instance-service";

export default async function InstancesPage() {
  const session = await requireSession();

  const instances = await db
    .select({
      id: planeInstances.id,
      name: planeInstances.name,
      baseUrl: planeInstances.baseUrl,
      workspaceSlug: planeInstances.workspaceSlug,
      projectId: planeInstances.projectId,
      defaultModuleId: planeInstances.defaultModuleId,
      lastSyncedAt: planeInstances.lastSyncedAt,
    })
    .from(planeInstances)
    .where(eq(planeInstances.userId, session.user.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Plane Instances</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Each instance stores Base URL, API key, workspace, project, and default module.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/instances/new">Add Instance</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {instances.map((instance) => {
          const safe = sanitizeInstance(instance);
          return (
            <Card key={safe.id}>
              <CardHeader>
                <CardTitle className="break-words">{safe.name}</CardTitle>
                <CardDescription className="break-all">{safe.baseUrl}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-700">
                <p>Workspace: {safe.workspaceSlug}</p>
                <p className="break-all">Project: {safe.projectId}</p>
                <p className="break-all">Default Module: {safe.defaultModuleId}</p>
                <p>
                  Last synced:{" "}
                  {safe.lastSyncedAt
                    ? new Date(safe.lastSyncedAt).toLocaleString()
                    : "Never"}
                </p>
                <Button asChild variant="outline" className="mt-4 w-full sm:w-auto">
                  <Link href={`/instances/${safe.id}/settings`}>Edit Settings</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
