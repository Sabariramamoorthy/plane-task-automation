"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Instance = {
  id: string;
  name: string;
  baseUrl: string;
  workspaceSlug: string;
  projectId: string;
  defaultModuleId: string;
};

type Option = { id: string; name: string };

type ParsedTask = {
  name: string;
  description_html: string;
  priority: "urgent" | "high" | "medium" | "low" | "none";
  module_ids: string[];
  assignee_ids: string[];
  follow_up_comment_html?: string;
  selected: boolean;
};

type CreateResult = {
  taskName: string;
  success: boolean;
  issueId?: string;
  planeUrl?: string;
  error?: string;
};

const steps = ["Select Instance", "Task Input", "Review & Assign", "Create"];

export function TaskWizard() {
  const [step, setStep] = useState(0);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [instanceId, setInstanceId] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [batchId, setBatchId] = useState("");
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [modules, setModules] = useState<Option[]>([]);
  const [assignees, setAssignees] = useState<Option[]>([]);
  const [results, setResults] = useState<CreateResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [syncSummary, setSyncSummary] = useState({ modules: 0, assignees: 0 });

  useEffect(() => {
    async function loadInstances() {
      const response = await fetch("/api/plane/instances");
      const data = await response.json();
      if (data.success) {
        setInstances(data.data);
        if (data.data.length > 0) {
          const firstId = data.data[0].id as string;
          setInstanceId(firstId);
          await loadInstanceData(firstId, false);
        }
      }
    }
    loadInstances();
  }, []);

  const selectedInstance = instances.find((item) => item.id === instanceId);

  function mapModuleOption(item: { id?: string; planeModuleId?: string; name: string }) {
    return {
      id: item.id ?? item.planeModuleId ?? "",
      name: item.name,
    };
  }

  function mapAssigneeOption(item: {
    id?: string;
    planeUserId?: string;
    name?: string;
    displayName?: string;
  }) {
    return {
      id: item.id ?? item.planeUserId ?? "",
      name: item.name ?? item.displayName ?? "Unknown",
    };
  }

  async function loadInstanceData(id: string, forceSync = false) {
    const response = await fetch(
      `/api/plane/instances/${id}${forceSync ? "?sync=true" : ""}`,
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? "Failed to load instance data");
    }

    const moduleOptions = (data.data.modules as Array<{
      id?: string;
      planeModuleId?: string;
      name: string;
    }>).map(mapModuleOption).filter((item) => item.id);

    const assigneeOptions = (data.data.assignees as Array<{
      id?: string;
      planeUserId?: string;
      name?: string;
      displayName?: string;
    }>).map(mapAssigneeOption).filter((item) => item.id);

    setModules(moduleOptions);
    setAssignees(assigneeOptions);
    setSyncSummary({
      modules: moduleOptions.length,
      assignees: assigneeOptions.length,
    });

    return { modules: moduleOptions.length, assignees: assigneeOptions.length };
  }

  async function refreshInstanceData() {
    if (!instanceId) return;
    setLoading(true);
    try {
      const counts = await loadInstanceData(instanceId, true);
      toast.success(
        `Synced ${counts.modules} modules and ${counts.assignees} assignees from Plane`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleParseTasks() {
    if (!instanceId || rawInput.trim().length < 10) {
      toast.error("Select an instance and enter a task statement");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/groq/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, rawInput }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setBatchId(data.data.batchId);
      setTasks(data.data.tasks);
      setModules(data.data.modules ?? []);
      setAssignees(data.data.assignees ?? []);
      setStep(2);
      const moduleCount = data.data.modules?.length ?? 0;
      const assigneeCount = data.data.assignees?.length ?? 0;
      toast.success(
        `Generated ${data.data.tasks.length} task(s). Loaded ${assigneeCount} assignees and ${moduleCount} modules.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateIssues() {
    const selected = tasks.filter((task) => task.selected);
    if (selected.length === 0) {
      toast.error("Select at least one task");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/plane/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId,
          batchId,
          tasks,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setResults(data.data.results);
      setStep(3);
      toast.success("Task creation completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  function updateTask(index: number, patch: Partial<ParsedTask>) {
    setTasks((current) =>
      current.map((task, i) => (i === index ? { ...task, ...patch } : task)),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((label, index) => (
          <Badge
            key={label}
            className={cn(
              "shrink-0 whitespace-nowrap",
              index === step ? "bg-zinc-900 text-white" : "",
            )}
          >
            {index + 1}. {label}
          </Badge>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Plane Instance</CardTitle>
            <CardDescription>
              Choose which configured Plane instance and project to use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {instances.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No instances yet. Add one in the Instances page.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="instance">Plane Instance</Label>
                <select
                  id="instance"
                  className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={instanceId}
                  onChange={async (e) => {
                    const nextId = e.target.value;
                    setInstanceId(nextId);
                    try {
                      await loadInstanceData(nextId, true);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Failed to sync instance",
                      );
                    }
                  }}
                >
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedInstance && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 break-words">
                <p>
                  <span className="font-medium">Workspace:</span>{" "}
                  {selectedInstance.workspaceSlug}
                </p>
                <p className="break-all">
                  <span className="font-medium">Project ID:</span>{" "}
                  {selectedInstance.projectId}
                </p>
                <p className="break-all">
                  <span className="font-medium">Default Module:</span>{" "}
                  {selectedInstance.defaultModuleId}
                </p>
                <p>
                  <span className="font-medium">Synced from Plane:</span>{" "}
                  {syncSummary.assignees} assignees, {syncSummary.modules} modules
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!instanceId || loading}
                onClick={refreshInstanceData}
              >
                Refresh from Plane
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={!instanceId || loading}
                onClick={async () => {
                  try {
                    await loadInstanceData(instanceId, true);
                    setStep(1);
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Failed to sync instance",
                    );
                  }
                }}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Task Statement</CardTitle>
            <CardDescription>
              Paste the raw request, email, or notes. Groq will structure them for Plane.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Describe the task or paste multiple items..."
              className="min-h-[240px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleParseTasks} disabled={loading}>
                {loading ? "Generating..." : "Generate Tasks"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-600">
              {assignees.length} assignees and {modules.length} modules loaded from Plane
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={loading || !instanceId}
              onClick={refreshInstanceData}
            >
              Refresh from Plane
            </Button>
          </div>
          {tasks.map((task, index) => (
            <Card key={`${task.name}-${index}`}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.selected}
                    onCheckedChange={(checked) =>
                      updateTask(index, { selected: checked === true })
                    }
                  />
                  <div className="min-w-0">
                    <CardTitle className="text-base break-words">{task.name}</CardTitle>
                    <CardDescription>Priority: {task.priority}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Task Name</Label>
                  <input
                    className="flex h-10 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    value={task.name}
                    onChange={(e) => updateTask(index, { name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      value={task.assignee_ids[0] ?? ""}
                      onChange={(e) =>
                        updateTask(index, {
                          assignee_ids: e.target.value ? [e.target.value] : [],
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Module</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                      value={task.module_ids[0] ?? ""}
                      onChange={(e) =>
                        updateTask(index, {
                          module_ids: e.target.value ? [e.target.value] : [],
                        })
                      }
                    >
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div
                  className="prose prose-sm prose-zinc max-w-none overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 [&_table]:block [&_table]:w-full [&_table]:min-w-[32rem] [&_table]:border-collapse [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-zinc-300 [&_th]:bg-zinc-100 [&_th]:px-2 [&_th]:py-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_pre]:text-zinc-100"
                  dangerouslySetInnerHTML={{ __html: task.description_html }}
                />
              </CardContent>
            </Card>
          ))}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleCreateIssues} disabled={loading}>
              {loading ? "Creating..." : "Create Selected Tasks in Plane"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Creation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result) => (
              <div
                key={result.taskName}
                className="rounded-md border border-zinc-200 p-4 text-sm break-words"
              >
                <p className="font-medium break-words">{result.taskName}</p>
                {result.success ? (
                  <a
                    href={result.planeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-zinc-700 underline"
                  >
                    Open in Plane
                  </a>
                ) : (
                  <p className="text-red-600">{result.error}</p>
                )}
              </div>
            ))}
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setStep(0);
                setRawInput("");
                setTasks([]);
                setResults([]);
              }}
            >
              Start New Batch
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
