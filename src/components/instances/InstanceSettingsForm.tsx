"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type InstanceSettingsFormProps = {
  mode: "create" | "edit";
  instanceId?: string;
  hasApiKey?: boolean;
  initialValues?: {
    name: string;
    baseUrl: string;
    workspaceSlug: string;
    projectId: string;
    defaultModuleId: string;
    apiPathStyle: "issues" | "work-items";
  };
};

const defaultValues = {
  name: "",
  baseUrl: "https://plane.crita.in",
  workspaceSlug: "",
  projectId: "",
  defaultModuleId: "",
  apiPathStyle: "issues" as const,
};

export function InstanceSettingsForm({
  mode: initialMode,
  instanceId: initialInstanceId,
  hasApiKey: initialHasApiKey = false,
  initialValues,
}: InstanceSettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({ ...defaultValues, ...initialValues });
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">(initialMode);
  const [instanceId, setInstanceId] = useState(initialInstanceId);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);

  function buildPayload() {
    const trimmedKey = apiKey.trim();
    return {
      ...form,
      ...(trimmedKey ? { apiKey: trimmedKey } : {}),
    };
  }

  function validateApiKeyForSave() {
    const trimmedKey = apiKey.trim();
    if (mode === "create" && !trimmedKey) {
      toast.error("API key is required");
      return false;
    }
    if (mode === "edit" && !hasApiKey && !trimmedKey) {
      toast.error("API key is required");
      return false;
    }
    return true;
  }

  async function persistInstance() {
    const payload = buildPayload();

    const response = await fetch(
      mode === "create" ? "/api/plane/instances" : `/api/plane/instances/${instanceId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? "Failed to save instance");
    }

    const savedId = data.data.id as string;
    setInstanceId(savedId);
    setMode("edit");
    if (apiKey.trim() || data.data.hasApiKey) {
      setHasApiKey(true);
    }
    setApiKey("");

    return savedId;
  }

  async function syncInstance(savedId: string) {
    const syncResponse = await fetch(`/api/plane/instances/${savedId}/sync`, {
      method: "POST",
    });
    const syncData = await syncResponse.json();
    if (!syncData.success) {
      throw new Error(syncData.error ?? "Sync failed after save");
    }
    return syncData.data as { modules: number; assignees: number };
  }

  async function saveInstance() {
    if (!validateApiKeyForSave()) return;

    setLoading(true);
    try {
      const savedId = await persistInstance();
      toast.success("Instance settings saved");

      try {
        const syncResult = await syncInstance(savedId);
        toast.success(
          `Synced ${syncResult.modules} modules and ${syncResult.assignees} assignees`,
        );
      } catch (syncError) {
        toast.error(
          syncError instanceof Error
            ? `Saved, but sync failed: ${syncError.message}`
            : "Saved, but sync failed",
        );
      }

      router.replace(`/instances/${savedId}/settings`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    if (!validateApiKeyForSave() && mode === "create") return;
    if (mode === "edit" && !hasApiKey && !apiKey.trim()) {
      toast.error("Enter an API key before testing");
      return;
    }

    setLoading(true);
    try {
      let id = instanceId;

      if (mode === "create" || apiKey.trim()) {
        id = await persistInstance();
        toast.success("Instance saved before testing");
      }

      if (!id) {
        throw new Error("Instance ID is missing");
      }

      const response = await fetch(`/api/plane/instances/${id}/test`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      toast.success(
        data.data.projectName
          ? `Connected. Project: ${data.data.projectName}`
          : "Connection successful",
      );

      router.replace(`/instances/${id}/settings`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Add Plane Instance" : "Instance Settings"}</CardTitle>
        <CardDescription>
          Configure all Plane connection fields for this instance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Instance Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Crita Production"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseUrl">Base URL (PLANE_BASE_URL)</Label>
          <Input
            id="baseUrl"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            placeholder="https://plane.crita.in"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="apiKey">API Key (PLANE_API_KEY)</Label>
            {hasApiKey && !apiKey ? (
              <Badge>Saved securely</Badge>
            ) : null}
          </div>
          <PasswordInput
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              hasApiKey
                ? "Enter a new API key to replace the saved one"
                : "plane_api_..."
            }
            autoComplete="off"
          />
          {hasApiKey && !apiKey ? (
            <p className="text-xs text-zinc-600">
              Your API key is stored encrypted. Leave this blank to keep the current key.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="workspaceSlug">Workspace Slug (PLANE_WORKSPACE_SLUG)</Label>
          <Input
            id="workspaceSlug"
            value={form.workspaceSlug}
            onChange={(e) => setForm({ ...form, workspaceSlug: e.target.value })}
            placeholder="crita-workspace"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectId">Project ID (PLANE_PROJECT_ID)</Label>
          <Input
            id="projectId"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            placeholder="36f3c8c1-fcee-4081-9624-8580caccb473"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultModuleId">Default Module ID (PLANE_DEFAULT_MODULE_ID)</Label>
          <Input
            id="defaultModuleId"
            value={form.defaultModuleId}
            onChange={(e) => setForm({ ...form, defaultModuleId: e.target.value })}
            placeholder="a51849a3-6916-4822-b0ed-9161114f7f78"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiPathStyle">API Path Style</Label>
          <select
            id="apiPathStyle"
            className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={form.apiPathStyle}
            onChange={(e) =>
              setForm({
                ...form,
                apiPathStyle: e.target.value as "issues" | "work-items",
              })
            }
          >
            <option value="issues">issues (self-hosted)</option>
            <option value="work-items">work-items (cloud)</option>
          </select>
        </div>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={testConnection}
            disabled={loading}
          >
            Test Connection
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={saveInstance} disabled={loading}>
            {loading ? "Saving..." : "Save & Sync"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
