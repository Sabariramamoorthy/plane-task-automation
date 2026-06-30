import { eq } from "drizzle-orm";
import { TaskWizard } from "@/components/wizard/TaskWizard";
import { getActiveSessionUser } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { planeInstances } from "@/lib/db/schema";

export default async function HomePage() {
  const user = await getActiveSessionUser();
  const instances = user
    ? await db
        .select({
          id: planeInstances.id,
          name: planeInstances.name,
          baseUrl: planeInstances.baseUrl,
          workspaceSlug: planeInstances.workspaceSlug,
          projectId: planeInstances.projectId,
          defaultModuleId: planeInstances.defaultModuleId,
        })
        .from(planeInstances)
        .where(eq(planeInstances.userId, user.id))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Task Wizard
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Select a Plane instance, describe your tasks, review Groq output, and create issues.
        </p>
      </div>
      <TaskWizard initialInstances={instances} />
    </div>
  );
}
