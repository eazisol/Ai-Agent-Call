import { buildApiUrl } from "./api-url.mjs";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string; status?: number };

type ErrorEnvelope = {
  error?: { code?: string; message?: string };
};

function apiUrl(path: string): string {
  return buildApiUrl(
    path,
    process.env.INTERNAL_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Auth client — never logs request bodies, passwords, or tokens. */

function errorMessage(body: unknown, fallback: string): { message: string; code?: string } {
  const envelope = body as ErrorEnvelope | null;
  const message = envelope?.error?.message?.trim();
  const code = envelope?.error?.code;
  return {
    message: message || fallback,
    code,
  };
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const url = apiUrl(path);
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers,
      signal: init?.signal ?? AbortSignal.timeout(15_000),
    });

    const body = await parseJson(response);
    if (!response.ok) {
      const parsed = errorMessage(body, "Request failed. Please try again.");
      return {
        ok: false,
        status: response.status,
        message: parsed.message,
        code: parsed.code,
      };
    }

    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      message: "The EaziAiCall API is temporarily unavailable.",
    };
  }
}

export const authApi = {
  me: () => request<{ user: AuthUser }>("auth/me"),

  register: (input: {
    email: string;
    password: string;
    displayName: string;
  }) =>
    request<{ user: AuthUser }>("auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<{ user: AuthUser }>("auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  logout: () =>
    request<{ success: true }>("auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  forgotPassword: (email: string) =>
    request<{ accepted: true }>("auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ reset: true }>("auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  verifyEmail: (token: string) =>
    request<{ user: AuthUser }>("auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};

export function authUserInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
