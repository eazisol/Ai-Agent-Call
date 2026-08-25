/**
 * Allow only same-origin relative return paths (open-redirect safe).
 * Supports query strings such as `/invitations/accept?token=…`.
 */
export function safeReturnPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw) {
    return fallback;
  }
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("://") || value.toLowerCase().includes("%2f%2f")) {
    return fallback;
  }
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return fallback;
  }
  return value;
}

export function invitationAcceptPath(token: string): string {
  return `/invitations/accept?token=${encodeURIComponent(token)}`;
}

export function withReturnTo(path: string, returnTo: string): string {
  const safe = safeReturnPath(returnTo, "");
  if (!safe) {
    return path;
  }
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("next", safe);
  return `${url.pathname}${url.search}`;
}
