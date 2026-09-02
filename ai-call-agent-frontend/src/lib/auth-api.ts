import {
  apiRequest,
  type ApiResult,
  DEFAULT_UNAVAILABLE_MESSAGE,
} from "./api-client";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerifiedAt: string | null;
  createdAt: string;
};

async function authRequest<T>(
  path: string,
  init?: Parameters<typeof apiRequest>[1],
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    timeoutMs: 30_000,
    timeoutMessage: "The sign-in request timed out. Please try again.",
    unavailableMessage: DEFAULT_UNAVAILABLE_MESSAGE,
    serverErrorFallback: DEFAULT_UNAVAILABLE_MESSAGE,
    ...init,
  });
}

export const authApi = {
  me: () => authRequest<{ user: AuthUser }>("auth/me"),

  register: (input: {
    email: string;
    password: string;
    displayName: string;
    returnTo?: string;
  }) =>
    authRequest<{ user: AuthUser }>("auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    authRequest<{ user: AuthUser }>("auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  logout: () =>
    authRequest<{ success: true }>("auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  forgotPassword: (email: string) =>
    authRequest<{ accepted: true }>("auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    authRequest<{ reset: true }>("auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  verifyEmail: (token: string) =>
    authRequest<{ user: AuthUser }>("auth/verify-email", {
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
