"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { LoadingState } from "@/components/patterns/loading-state";
import {
  organizationsApi,
  type Organization,
} from "@/lib/organizations-api";

type OrgStatus = "loading" | "ready" | "empty" | "error";

type OrganizationSessionContextValue = {
  status: OrgStatus;
  organizations: Organization[];
  active: Organization | null;
  error: string | null;
  refresh: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<boolean>;
  createOrganization: (input: {
    name: string;
    slug?: string;
  }) => Promise<{ ok: true; organization: Organization } | { ok: false; message: string }>;
};

const OrganizationSessionContext =
  React.createContext<OrganizationSessionContextValue | null>(null);

const ONBOARDING_PATH = "/onboarding/organization";

export function OrganizationSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = React.useState<OrgStatus>("loading");
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [active, setActive] = React.useState<Organization | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    const [listResult, activeResult] = await Promise.all([
      organizationsApi.list(),
      organizationsApi.getActive(),
    ]);

    if (!listResult.ok) {
      setOrganizations([]);
      setActive(null);
      setError(listResult.message);
      setStatus("error");
      return;
    }

    const orgs = listResult.data.organizations;
    setOrganizations(orgs);

    if (orgs.length === 0) {
      setActive(null);
      setStatus("empty");
      return;
    }

    let nextActive =
      activeResult.ok && activeResult.data.organization
        ? activeResult.data.organization
        : null;

    if (!nextActive || !orgs.some((org) => org.id === nextActive?.id)) {
      const preferred = orgs[0];
      const switched = await organizationsApi.setActive(preferred.id);
      nextActive = switched.ok ? switched.data.organization : preferred;
    }

    setActive(nextActive);
    setStatus("ready");
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchOrganization = React.useCallback(
    async (organizationId: string) => {
      const result = await organizationsApi.setActive(organizationId);
      if (!result.ok) {
        setError(result.message);
        return false;
      }
      setActive(result.data.organization);
      setOrganizations((prev) => {
        const exists = prev.some((org) => org.id === result.data.organization.id);
        return exists
          ? prev.map((org) =>
              org.id === result.data.organization.id
                ? result.data.organization
                : org,
            )
          : [...prev, result.data.organization];
      });
      setStatus("ready");
      return true;
    },
    [],
  );

  const createOrganization = React.useCallback(
    async (input: { name: string; slug?: string }) => {
      const result = await organizationsApi.create(input);
      if (!result.ok) {
        return { ok: false as const, message: result.message };
      }
      setOrganizations((prev) => {
        const without = prev.filter((org) => org.id !== result.data.organization.id);
        return [...without, result.data.organization];
      });
      setActive(result.data.organization);
      setStatus("ready");
      return { ok: true as const, organization: result.data.organization };
    },
    [],
  );

  const value = React.useMemo<OrganizationSessionContextValue>(
    () => ({
      status,
      organizations,
      active,
      error,
      refresh,
      switchOrganization,
      createOrganization,
    }),
    [
      status,
      organizations,
      active,
      error,
      refresh,
      switchOrganization,
      createOrganization,
    ],
  );

  return (
    <OrganizationSessionContext.Provider value={value}>
      {children}
    </OrganizationSessionContext.Provider>
  );
}

export function useOrganizationSession(): OrganizationSessionContextValue {
  const ctx = React.useContext(OrganizationSessionContext);
  if (!ctx) {
    throw new Error(
      "useOrganizationSession must be used within OrganizationSessionProvider",
    );
  }
  return ctx;
}

export function useOptionalOrganizationSession(): OrganizationSessionContextValue | null {
  return React.useContext(OrganizationSessionContext);
}

export function RequireOrganization({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, error, refresh } = useOrganizationSession();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const onOnboarding = pathname === ONBOARDING_PATH;

  React.useEffect(() => {
    if (status === "empty" && !onOnboarding) {
      router.replace(ONBOARDING_PATH);
    }
  }, [status, onOnboarding, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <LoadingState
          className="w-full max-w-md border-0 bg-transparent"
          label="Loading your workspaces…"
        />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <LoadingState
          className="w-full max-w-md"
          label={error ?? "Could not load organizations."}
        />
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => void refresh()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === "empty" && !onOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <LoadingState
          className="w-full max-w-md border-0 bg-transparent"
          label="Taking you to create a workspace…"
        />
      </div>
    );
  }

  return children;
}
