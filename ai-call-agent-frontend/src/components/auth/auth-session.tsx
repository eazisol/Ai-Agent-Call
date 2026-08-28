"use client";

import { useEffectTask } from "@/hooks/use-effect-task";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { LoadingState } from "@/components/patterns/loading-state";
import {
  authApi,
  authUserInitials,
  type AuthUser,
} from "@/lib/auth-api";
import { resolvePostAuthPath } from "@/lib/invite-return";
import type { PortalUser } from "@/mocks/portal-shell";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthSessionContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  portalUser: PortalUser | null;
  refresh: () => Promise<AuthStatus>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};

const AuthSessionContext = React.createContext<AuthSessionContextValue | null>(
  null,
);

function toPortalUser(user: AuthUser): PortalUser {
  return {
    name: user.displayName,
    email: user.email,
    role: "Member",
    initials: authUserInitials(user.displayName),
  };
}

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [user, setUserState] = React.useState<AuthUser | null>(null);

  const setUser = React.useCallback((next: AuthUser | null) => {
    setUserState(next);
    setStatus(next ? "authenticated" : "anonymous");
  }, []);

  const refresh = React.useCallback(async (): Promise<AuthStatus> => {
    const result = await authApi.me();
    if (result.ok) {
      setUserState(result.data.user);
      setStatus("authenticated");
      return "authenticated";
    }
    setUserState(null);
    setStatus("anonymous");
    return "anonymous";
  }, []);

  const logout = React.useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, [setUser]);

  useEffectTask(refresh, [refresh]);

  const value = React.useMemo<AuthSessionContextValue>(
    () => ({
      status,
      user,
      portalUser: user ? toPortalUser(user) : null,
      refresh,
      setUser,
      logout,
    }),
    [status, user, refresh, setUser, logout],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useOptionalAuthSession(): AuthSessionContextValue | null {
  return React.useContext(AuthSessionContext);
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useOptionalAuthSession();
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status !== "anonymous") {
      return;
    }
    const next = pathname && pathname !== "/login" ? pathname : "/dashboard";
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <LoadingState
          className="w-full max-w-md border-0 bg-transparent"
          label="Restoring your session…"
        />
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <LoadingState
          className="w-full max-w-md border-0 bg-transparent"
          label="Redirecting to sign in…"
        />
      </div>
    );
  }

  return children;
}

export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuthSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    router.replace(resolvePostAuthPath(params.get("next")));
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <LoadingState
          className="w-full max-w-md border-0 bg-transparent"
          label="Checking session…"
        />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <LoadingState
          className="w-full max-w-md border-0 bg-transparent"
          label="Continuing…"
        />
      </div>
    );
  }

  return children;
}
