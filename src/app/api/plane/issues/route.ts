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
import { createdIssues, taskBatches } from "@/lib/db/schema";
import { getPlaneClientForInstance } from "@/lib/plane/instance-service";
import { createIssuesRequestSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createIssuesRequestSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const plane = await getPlaneClientForInstance(parsed.data.instanceId, user.id);
    if (!plane) return notFound("Instance not found");

    const selectedTasks = parsed.data.tasks.filter((task) => task.selected);
    if (selectedTasks.length === 0) {
      return badRequest("Select at least one task to create");
    }

    let batchId = parsed.data.batchId;
    if (!batchId) {
      const [batch] = await db
        .insert(taskBatches)
        .values({
          userId: user.id,
          instanceId: plane.instance.id,
          rawInput: "Manual create",
          status: "creating",
        })
        .returning();
      batchId = batch.id;
    }

    const results = [];

    for (const task of selectedTasks) {
      try {
        const issue = await plane.client.createIssue({
          name: task.name,
          description_html: task.description_html,
          priority: task.priority,
          assignees: task.assignee_ids,
          module_ids:
            task.module_ids.length > 0
              ? task.module_ids
              : [plane.instance.defaultModuleId],
        });

        if (task.follow_up_comment_html) {
          await plane.client.addComment(issue.id, task.follow_up_comment_html);
        }

        const planeUrl = plane.client.buildIssueUrl(issue.id);

        await db.insert(createdIssues).values({
          batchId,
          userId: user.id,
          instanceId: plane.instance.id,
          planeIssueId: issue.id,
          taskName: task.name,
          assigneeIds: task.assignee_ids,
          moduleIds: task.module_ids,
          planeUrl,
        });

        results.push({
          taskName: task.name,
          success: true,
          issueId: issue.id,
          planeUrl,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Create failed";
        await db.insert(createdIssues).values({
          batchId,
          userId: user.id,
          instanceId: plane.instance.id,
          taskName: task.name,
          assigneeIds: task.assignee_ids,
          moduleIds: task.module_ids,
          error: message,
        });
        results.push({
          taskName: task.name,
          success: false,
          error: message,
        });
      }
    }

    return ok({ batchId, results });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to create issues");
  }
}
