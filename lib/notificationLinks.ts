const prefixes: Record<string, string> = { customer: "/customer/", rider: "/rider/", restaurant: "/restaurant/", "sales-agent": "/sales-agent/", admin: "/admin/dashboard/" };

export function notificationHref(data: unknown, role: string) {
  const fallback = role === "admin" ? "/admin/dashboard/notifications" : `${prefixes[role] ?? "/"}notifications`;
  if (!data || typeof data !== "object" || !("url" in data)) return fallback;
  const url = (data as { url?: unknown }).url;
  return typeof url === "string" && url.startsWith(prefixes[role] ?? "/__invalid__") && !url.startsWith("//") ? url : fallback;
}
