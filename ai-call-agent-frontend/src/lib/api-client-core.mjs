export const DEFAULT_API_TIMEOUT_MS = 30_000;

export const DEFAULT_UNAVAILABLE_MESSAGE =
  "The EaziAiCall API is temporarily unavailable.";

export const DEFAULT_TIMEOUT_MESSAGE =
  "The request timed out. Check your connection and try again.";

export const DEFAULT_CLIENT_ERROR_MESSAGE =
  "Request failed. Please try again.";

export async function parseApiJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseApiError(body, fallback) {
  const envelope = body;
  return {
    message: envelope?.error?.message?.trim() || fallback,
    code: envelope?.error?.code,
  };
}

export function classifyFetchFailure(error, options = {}) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return options.timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE;
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return options.timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE;
  }
  return options.unavailableMessage ?? DEFAULT_UNAVAILABLE_MESSAGE;
}

function isFormDataBody(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export async function apiRequestCore(path, resolveApiUrl, init = {}) {
  const {
    timeoutMs,
    unavailableMessage,
    timeoutMessage,
    clientErrorFallback,
    serverErrorFallback,
    ...fetchInit
  } = init;

  try {
    const headers = new Headers(fetchInit.headers);
    headers.set("Accept", "application/json");
    const body = fetchInit.body;
    if (body && !isFormDataBody(body) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(resolveApiUrl(path), {
      ...fetchInit,
      credentials: "include",
      cache: "no-store",
      headers,
      signal:
        fetchInit.signal ??
        AbortSignal.timeout(timeoutMs ?? DEFAULT_API_TIMEOUT_MS),
    });

    const parsedBody = await parseApiJson(response);
    if (!response.ok) {
      const fallback =
        response.status >= 500
          ? (serverErrorFallback ?? DEFAULT_UNAVAILABLE_MESSAGE)
          : (clientErrorFallback ?? DEFAULT_CLIENT_ERROR_MESSAGE);
      const parsed = parseApiError(parsedBody, fallback);
      return {
        ok: false,
        status: response.status,
        message: parsed.message,
        code: parsed.code,
      };
    }

    return { ok: true, data: parsedBody, status: response.status };
  } catch (error) {
    return {
      ok: false,
      message: classifyFetchFailure(error, {
        timeoutMessage,
        unavailableMessage,
      }),
    };
  }
}
