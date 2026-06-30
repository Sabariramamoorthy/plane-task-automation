import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// App tables
export const planeInstances = pgTable("plane_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  workspaceSlug: text("workspace_slug").notNull(),
  projectId: text("project_id").notNull(),
  defaultModuleId: text("default_module_id").notNull(),
  apiPathStyle: text("api_path_style").notNull().default("issues"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const planeModules = pgTable("plane_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => planeInstances.id, { onDelete: "cascade" }),
  planeModuleId: text("plane_module_id").notNull(),
  name: text("name").notNull(),
  status: text("status"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

export const planeAssignees = pgTable("plane_assignees", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => planeInstances.id, { onDelete: "cascade" }),
  planeMemberId: text("plane_member_id").notNull(),
  planeUserId: text("plane_user_id").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

export const taskBatches = pgTable("task_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => planeInstances.id, { onDelete: "cascade" }),
  rawInput: text("raw_input").notNull(),
  groqOutputJson: jsonb("groq_output_json"),
  status: text("status").notNull().default("parsed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const createdIssues = pgTable("created_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => taskBatches.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => planeInstances.id, { onDelete: "cascade" }),
  planeIssueId: text("plane_issue_id"),
  taskName: text("task_name").notNull(),
  assigneeIds: jsonb("assignee_ids").$type<string[]>().default([]),
  moduleIds: jsonb("module_ids").$type<string[]>().default([]),
  planeUrl: text("plane_url"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userUsageLimits = pgTable("user_usage_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  monthlyRequestLimit: integer("monthly_request_limit").notNull().default(250),
  monthlyTokenLimit: integer("monthly_token_limit").notNull().default(300000),
  isBillingEnabled: boolean("is_billing_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  instanceId: uuid("instance_id").references(() => planeInstances.id, {
    onDelete: "set null",
  }),
  operation: text("operation").notNull().default("task_parse"),
  inputChars: integer("input_chars").notNull().default(0),
  outputChars: integer("output_chars").notNull().default(0),
  estimatedTokens: integer("estimated_tokens").notNull().default(0),
  estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const billingInvoices = pgTable("billing_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  invoiceMonth: text("invoice_month").notNull(),
  totalRequests: integer("total_requests").notNull().default(0),
  totalEstimatedTokens: integer("total_estimated_tokens").notNull().default(0),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const planeInstancesRelations = relations(planeInstances, ({ many, one }) => ({
  user: one(user, { fields: [planeInstances.userId], references: [user.id] }),
  modules: many(planeModules),
  assignees: many(planeAssignees),
  batches: many(taskBatches),
}));

export const planeModulesRelations = relations(planeModules, ({ one }) => ({
  instance: one(planeInstances, {
    fields: [planeModules.instanceId],
    references: [planeInstances.id],
  }),
}));

export const planeAssigneesRelations = relations(planeAssignees, ({ one }) => ({
  instance: one(planeInstances, {
    fields: [planeAssignees.instanceId],
    references: [planeInstances.id],
  }),
}));

export const taskBatchesRelations = relations(taskBatches, ({ one, many }) => ({
  user: one(user, { fields: [taskBatches.userId], references: [user.id] }),
  instance: one(planeInstances, {
    fields: [taskBatches.instanceId],
    references: [planeInstances.id],
  }),
  createdIssues: many(createdIssues),
}));

export const createdIssuesRelations = relations(createdIssues, ({ one }) => ({
  batch: one(taskBatches, {
    fields: [createdIssues.batchId],
    references: [taskBatches.id],
  }),
}));

export const userUsageLimitsRelations = relations(userUsageLimits, ({ one }) => ({
  user: one(user, {
    fields: [userUsageLimits.userId],
    references: [user.id],
  }),
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  user: one(user, {
    fields: [aiUsageLogs.userId],
    references: [user.id],
  }),
  instance: one(planeInstances, {
    fields: [aiUsageLogs.instanceId],
    references: [planeInstances.id],
  }),
}));

export const billingInvoicesRelations = relations(billingInvoices, ({ one }) => ({
  user: one(user, {
    fields: [billingInvoices.userId],
    references: [user.id],
  }),
}));

export type PlaneInstance = typeof planeInstances.$inferSelect;
export type PlaneModule = typeof planeModules.$inferSelect;
export type PlaneAssignee = typeof planeAssignees.$inferSelect;
export type TaskBatch = typeof taskBatches.$inferSelect;
export type UserUsageLimit = typeof userUsageLimits.$inferSelect;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type BillingInvoice = typeof billingInvoices.$inferSelect;
