export function extractListItems<T extends Record<string, unknown>>(
  data: unknown,
): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;

  if (Array.isArray(record.results)) {
    return record.results as T[];
  }

  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  return [];
}

export function getNextPageUrl(
  basePath: string,
  data: unknown,
  currentPath: string,
): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const nextPage = record.next_page_number ?? record.next;

  if (typeof nextPage === "number" && nextPage > 0) {
    const [pathOnly, query = ""] = currentPath.split("?");
    const params = new URLSearchParams(query);
    params.set("page", String(nextPage));
    const queryString = params.toString();
    return queryString ? `${pathOnly}?${queryString}` : pathOnly;
  }

  if (typeof nextPage === "string" && nextPage.length > 0) {
    if (nextPage.startsWith("/api/")) return nextPage;
    if (nextPage.startsWith("http")) {
      const url = new URL(nextPage);
      return `${url.pathname}${url.search}`;
    }
  }

  return null;
}

export function resolveDisplayName(item: Record<string, unknown>): string {
  if (typeof item.display_name === "string" && item.display_name.trim()) {
    return item.display_name.trim();
  }

  const first = typeof item.first_name === "string" ? item.first_name.trim() : "";
  const last = typeof item.last_name === "string" ? item.last_name.trim() : "";
  const fullName = [first, last].filter(Boolean).join(" ");
  if (fullName) return fullName;

  if (typeof item.name === "string" && item.name.trim()) {
    return item.name.trim();
  }

  if (typeof item.email === "string" && item.email.trim()) {
    return item.email.trim();
  }

  return "Unknown";
}

export function mapAssigneeItem(item: Record<string, unknown>) {
  const nestedMember =
    item.member && typeof item.member === "object"
      ? (item.member as Record<string, unknown>)
      : null;

  const userId = String(
    nestedMember?.id ??
      (typeof item.member === "string" ? item.member : undefined) ??
      item.id,
  );

  const source = nestedMember ?? item;

  return {
    id: userId,
    member_id: String(item.id ?? userId),
    display_name: resolveDisplayName(source),
    email: typeof source.email === "string" ? source.email : undefined,
    avatar:
      typeof source.avatar === "string"
        ? source.avatar
        : typeof source.avatar_url === "string"
          ? source.avatar_url
          : undefined,
  };
}

export function mapModuleItem(item: Record<string, unknown>) {
  return {
    id: String(item.id),
    name: String(item.name ?? "Unnamed module"),
    status: item.status ? String(item.status) : undefined,
  };
}
