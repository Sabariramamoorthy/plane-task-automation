import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { planeInstances } from "@/lib/db/schema";
import { InstanceSettingsForm } from "@/components/instances/InstanceSettingsForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstanceSettingsPage({ params }: PageProps) {
  const session = await requireSession();

  const { id } = await params;
  const [instance] = await db
    .select()
    .from(planeInstances)
    .where(eq(planeInstances.id, id))
    .limit(1);

  if (!instance || instance.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{instance.name}</h1>
        <p className="mt-2 text-sm text-zinc-600">Update Plane connection settings.</p>
      </div>
      <InstanceSettingsForm
        mode="edit"
        instanceId={instance.id}
        hasApiKey={Boolean(instance.apiKeyEncrypted)}
        initialValues={{
          name: instance.name,
          baseUrl: instance.baseUrl,
          workspaceSlug: instance.workspaceSlug,
          projectId: instance.projectId,
          defaultModuleId: instance.defaultModuleId,
          apiPathStyle: instance.apiPathStyle as "issues" | "work-items",
        }}
      />
    </div>
  );
}
