import { z } from "zod";

const uuidSchema = z.string().uuid();

function optionalTrimmedApiKey() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

export const instanceSettingsSchema = z.object({
  name: z.string().min(1, "Instance name is required").max(100),
  baseUrl: z.string().url("Base URL must be a valid URL"),
  apiKey: optionalTrimmedApiKey(),
  workspaceSlug: z.string().min(1, "Workspace slug is required"),
  projectId: uuidSchema,
  defaultModuleId: uuidSchema,
  apiPathStyle: z.enum(["issues", "work-items"]).default("issues"),
});

export const createInstanceSchema = instanceSettingsSchema.extend({
  apiKey: z.string().trim().min(1, "API key is required"),
});

export type InstanceSettingsInput = z.infer<typeof instanceSettingsSchema>;
export type CreateInstanceInput = z.infer<typeof createInstanceSchema>;

export const groqTaskSchema = z.object({
  tasks: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        description_html: z
          .string()
          .min(100, "Description must be detailed HTML"),
        priority: z
          .enum(["urgent", "high", "medium", "low", "none"])
          .default("medium"),
        suggested_assignee_name: z.string().optional(),
        suggested_module_name: z.string().optional(),
        module_ids: z.array(z.string().uuid()).optional(),
        follow_up_comment_html: z.string().optional(),
      }),
    )
    .min(1),
});

export type GroqTaskOutput = z.infer<typeof groqTaskSchema>;

export const parseTasksRequestSchema = z.object({
  instanceId: z.string().uuid(),
  rawInput: z.string().min(10, "Task statement is too short"),
});

export const createIssuesRequestSchema = z.object({
  instanceId: z.string().uuid(),
  batchId: z.string().uuid().optional(),
  tasks: z
    .array(
      z.object({
        name: z.string().min(1),
        description_html: z.string(),
        priority: z.enum(["urgent", "high", "medium", "low", "none"]),
        assignee_ids: z.array(z.string().uuid()).default([]),
        module_ids: z.array(z.string().uuid()).default([]),
        follow_up_comment_html: z.string().optional(),
        selected: z.boolean().default(true),
      }),
    )
    .min(1),
});

export type CreateIssuesInput = z.infer<typeof createIssuesRequestSchema>;
