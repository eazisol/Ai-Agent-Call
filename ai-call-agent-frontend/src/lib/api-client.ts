import { buildApiUrl } from "./api-url.mjs";
import {
  apiRequestCore,
  DEFAULT_API_TIMEOUT_MS,
  DEFAULT_CLIENT_ERROR_MESSAGE,
  DEFAULT_TIMEOUT_MESSAGE,
  DEFAULT_UNAVAILABLE_MESSAGE,
  classifyFetchFailure,
  parseApiError,
  parseApiJson,
} from "./api-client-core.mjs";

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; message: string; code?: string; status?: number };

export type ApiErrorEnvelope = {
  error?: { code?: string; message?: string };
};

export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
  unavailableMessage?: string;
  timeoutMessage?: string;
  clientErrorFallback?: string;
  serverErrorFallback?: string;
};

export {
  DEFAULT_API_TIMEOUT_MS,
  DEFAULT_CLIENT_ERROR_MESSAGE,
  DEFAULT_TIMEOUT_MESSAGE,
  DEFAULT_UNAVAILABLE_MESSAGE,
  classifyFetchFailure,
  parseApiError,
  parseApiJson,
};

function resolveApiUrl(path: string): string {
  return buildApiUrl(
    path,
    process.env.INTERNAL_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  );
}

/** Shared browser/server API transport — never logs bodies, passwords, or tokens. */
export async function apiRequest<T>(
  path: string,
  init?: ApiRequestOptions,
): Promise<ApiResult<T>> {
  return apiRequestCore(path, resolveApiUrl, init) as Promise<ApiResult<T>>;
}
