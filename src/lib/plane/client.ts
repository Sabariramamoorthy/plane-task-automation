import {
  extractListItems,
  getNextPageUrl,
  mapAssigneeItem,
  mapModuleItem,
} from "@/lib/plane/parse-list";

export type PlaneInstanceConfig = {
  baseUrl: string;
  apiKey: string;
  workspaceSlug: string;
  projectId: string;
  defaultModuleId: string;
  apiPathStyle: "issues" | "work-items";
};

export type PlaneModule = {
  id: string;
  name: string;
  status?: string;
};

export type PlaneAssignee = {
  id: string;
  member_id: string;
  display_name: string;
  email?: string;
  avatar?: string;
};

export type PlaneIssueCreate = {
  name: string;
  description_html: string;
  priority: string;
  assignees?: string[];
  module_ids?: string[];
};

export type PlaneIssue = {
  id: string;
  name: string;
};

type PlaneApiError = {
  message?: string;
  error?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function createPlaneClient(config: PlaneInstanceConfig) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const resource = config.apiPathStyle === "work-items" ? "work-items" : "issues";

  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const parsed = JSON.parse(text) as PlaneApiError;
        message = parsed.message ?? parsed.error ?? text;
      } catch {
        // keep raw text
      }
      throw new Error(message || `Plane API error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  async function fetchAllPages(
    initialPath: string,
    mapItem: (item: Record<string, unknown>) => PlaneModule | PlaneAssignee,
  ) {
    const items: Array<PlaneModule | PlaneAssignee> = [];
    let path = initialPath;

    for (let page = 0; page < 20; page += 1) {
      const data = await request<unknown>(path);
      const batch = extractListItems<Record<string, unknown>>(data);
      items.push(...batch.map(mapItem));

      const nextPath = getNextPageUrl(initialPath.split("?")[0], data, path);
      if (!nextPath || batch.length === 0) {
        break;
      }
      path = nextPath;
    }

    return items;
  }

  return {
    async testConnection(): Promise<{ ok: boolean; projectName?: string }> {
      const data = await request<{ name?: string }>(
        `/api/v1/workspaces/${config.workspaceSlug}/projects/${config.projectId}/`,
      );
      return { ok: true, projectName: data.name };
    },

    async syncModules(): Promise<PlaneModule[]> {
      const modules = await fetchAllPages(
        `/api/v1/workspaces/${config.workspaceSlug}/projects/${config.projectId}/modules/?per_page=100`,
        mapModuleItem,
      );

      return modules as PlaneModule[];
    },

    async syncAssignees(): Promise<PlaneAssignee[]> {
      const projectMembersPath = `/api/v1/workspaces/${config.workspaceSlug}/projects/${config.projectId}/members/`;
      const workspaceMembersPath = `/api/v1/workspaces/${config.workspaceSlug}/members/`;

      let assignees = (await fetchAllPages(
        projectMembersPath,
        mapAssigneeItem,
      )) as PlaneAssignee[];

      if (assignees.length === 0) {
        assignees = (await fetchAllPages(
          workspaceMembersPath,
          mapAssigneeItem,
        )) as PlaneAssignee[];
      }

      const unique = new Map<string, PlaneAssignee>();
      for (const assignee of assignees) {
        if (assignee.id && assignee.id !== "undefined") {
          unique.set(assignee.id, assignee);
        }
      }

      return Array.from(unique.values());
    },

    async createIssue(payload: PlaneIssueCreate): Promise<PlaneIssue> {
      return request<PlaneIssue>(
        `/api/v1/workspaces/${config.workspaceSlug}/projects/${config.projectId}/${resource}/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },

    async addComment(issueId: string, commentHtml: string): Promise<void> {
      await request(
        `/api/v1/workspaces/${config.workspaceSlug}/projects/${config.projectId}/${resource}/${issueId}/comments/`,
        {
          method: "POST",
          body: JSON.stringify({ comment_html: commentHtml }),
        },
      );
    },

    buildIssueUrl(issueId: string): string {
      return `${baseUrl}/${config.workspaceSlug}/projects/${config.projectId}/${resource}/${issueId}`;
    },
  };
}

export function fuzzyMatchName(
  query: string | undefined,
  candidates: Array<{ id: string; name: string }>,
): string | undefined {
  if (!query) return undefined;
  const normalized = query.trim().toLowerCase();
  const exact = candidates.find((c) => c.name.toLowerCase() === normalized);
  if (exact) return exact.id;
  const partial = candidates.find((c) =>
    c.name.toLowerCase().includes(normalized),
  );
  return partial?.id;
}
