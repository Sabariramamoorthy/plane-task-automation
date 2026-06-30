import { NextRequest } from "next/server";
import {
  badRequest,
  getSessionUser,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { taskBatches } from "@/lib/db/schema";
import { trackAiUsage } from "@/lib/billing";
import { parseTasksWithGroq } from "@/lib/groq/parse-tasks";
import { fuzzyMatchName } from "@/lib/plane/client";
import { getOwnedInstance } from "@/lib/plane/instance-service";
import {
  getCachedInstanceOptions,
  syncInstanceData,
} from "@/lib/plane/sync-cache";
import { parseTasksRequestSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const parsed = parseTasksRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const instance = await getOwnedInstance(parsed.data.instanceId, user.id);
    if (!instance) return notFound("Instance not found");

    const groqOutput = await parseTasksWithGroq(parsed.data.rawInput);
    const outputChars = groqOutput.tasks.reduce(
      (sum, task) => sum + task.description_html.length + task.name.length,
      0,
    );

    await trackAiUsage({
      userId: user.id,
      instanceId: instance.id,
      operation: "task_parse",
      inputChars: parsed.data.rawInput.length,
      outputChars,
    });

    let options = await getCachedInstanceOptions(instance.id);
    if (options.isEmpty) {
      await syncInstanceData(instance.id);
      options = await getCachedInstanceOptions(instance.id);
    }

    const tasks = groqOutput.tasks.map((task) => {
      const moduleId =
        task.module_ids?.[0] ??
        fuzzyMatchName(task.suggested_module_name, options.modules) ??
        instance.defaultModuleId;
      const assigneeId = fuzzyMatchName(
        task.suggested_assignee_name,
        options.assignees,
      );

      return {
        ...task,
        module_ids: [moduleId],
        assignee_ids: assigneeId ? [assigneeId] : [],
        selected: true,
      };
    });

    const [batch] = await db
      .insert(taskBatches)
      .values({
        userId: user.id,
        instanceId: instance.id,
        rawInput: parsed.data.rawInput,
        groqOutputJson: { tasks },
        status: "parsed",
      })
      .returning();

    return ok({
      batchId: batch.id,
      tasks,
      modules: options.modules,
      assignees: options.assignees,
      defaultModuleId: instance.defaultModuleId,
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to parse tasks");
  }
}
