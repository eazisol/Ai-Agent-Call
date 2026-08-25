/**
 * Persist invite return path across register → verify → login.
 * Only /invitations/accept… paths are stored (open-redirect safe).
 * Not used for auth tokens — only the return URL for the join flow.
 */
import { safeReturnPath } from "./safe-return-path";

const COOKIE = "eazi_invite_return";
const MAX_AGE_SECONDS = 60 * 60 * 2;

function isInviteAcceptPath(path: string): boolean {
  return path === "/invitations/accept" || path.startsWith("/invitations/accept?");
}

export function rememberInviteReturn(path: string): void {
  if (typeof document === "undefined") {
    return;
  }
  const safe = safeReturnPath(path, "");
  if (!safe || !isInviteAcceptPath(safe)) {
    return;
  }
  document.cookie = `${COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function readInviteReturn(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const parts = document.cookie.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${COOKIE}=`)) {
      continue;
    }
    const raw = decodeURIComponent(part.slice(COOKIE.length + 1));
    const safe = safeReturnPath(raw, "");
    if (safe && isInviteAcceptPath(safe)) {
      return safe;
    }
  }
  return null;
}

export function clearInviteReturn(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Prefer explicit next query, then invite cookie, else dashboard. */
export function resolvePostAuthPath(
  nextFromQuery: string | null | undefined,
): string {
  const fromQuery = safeReturnPath(nextFromQuery, "");
  if (fromQuery && fromQuery !== "/dashboard" && fromQuery !== "") {
    if (isInviteAcceptPath(fromQuery)) {
      rememberInviteReturn(fromQuery);
    }
    return fromQuery;
  }
  const fromCookie = readInviteReturn();
  if (fromCookie) {
    return fromCookie;
  }
  return "/dashboard";
}
