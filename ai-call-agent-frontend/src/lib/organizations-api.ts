import { buildApiUrl } from "./api-url.mjs";

export type OrganizationRole = "owner" | "admin" | "manager" | "viewer";

export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
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

function errorMessage(
  body: unknown,
  fallback: string,
): { message: string; code?: string } {
  const envelope = body as ErrorEnvelope | null;
  return {
    message: envelope?.error?.message?.trim() || fallback,
    code: envelope?.error?.code,
  };
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(apiUrl(path), {
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

/** Organizations client — credentials cookies only; no request body logging. */
export const organizationsApi = {
  list: () => request<{ organizations: Organization[] }>("organizations"),

  get: (id: string) =>
    request<{ organization: Organization }>(
      `organizations/${encodeURIComponent(id)}`,
    ),

  create: (input: { name: string; slug?: string }) =>
    request<{ organization: Organization }>("organizations", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: { name?: string; slug?: string | null }) =>
    request<{ organization: Organization }>(
      `organizations/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),

  getActive: () =>
    request<{ organization: Organization | null }>("organizations/active"),

  setActive: (organizationId: string) =>
    request<{ organization: Organization }>("organizations/active", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    }),

  clearActive: () =>
    request<{ cleared: true }>("organizations/active", {
      method: "DELETE",
    }),
};
