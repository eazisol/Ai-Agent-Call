import type { Call } from "@/types/call";
import { buildApiUrl } from "./api-url.mjs";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status?: number };

async function get<T>(path: string): Promise<ApiResult<T>> {
  const url = buildApiUrl(
    path,
    process.env.INTERNAL_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  );

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          response.status === 404
            ? "This view is not available in the current environment."
            : "EaziAiCall could not load this data.",
      };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      message: "The EaziAiCall API is temporarily unavailable.",
    };
  }
}

export const callsApi = {
  list: (): Promise<ApiResult<Call[]>> => get<Call[]>("calls"),
  find: (id: string): Promise<ApiResult<Call>> =>
    get<Call>(`calls/${encodeURIComponent(id)}`),
};
