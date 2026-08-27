"use client";

import * as React from "react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import {
  businessesApi,
  type Business,
  type CreateBusinessInput,
} from "@/lib/businesses-api";

type BusinessStatus = "loading" | "ready" | "empty" | "error";

type BusinessSessionContextValue = {
  status: BusinessStatus;
  businesses: Business[];
  active: Business | null;
  error: string | null;
  refresh: () => Promise<void>;
  switchBusiness: (businessId: string) => Promise<boolean>;
  createBusiness: (
    input: CreateBusinessInput,
  ) => Promise<{ ok: true; business: Business } | { ok: false; message: string }>;
};

const BusinessSessionContext =
  React.createContext<BusinessSessionContextValue | null>(null);

export function BusinessSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { active: org, status: orgStatus } = useOrganizationSession();
  const [status, setStatus] = React.useState<BusinessStatus>("loading");
  const [businesses, setBusinesses] = React.useState<Business[]>([]);
  const [active, setActive] = React.useState<Business | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (orgStatus !== "ready" || !org) {
      setBusinesses([]);
      setActive(null);
      setStatus(orgStatus === "loading" ? "loading" : "empty");
      return;
    }

    setError(null);
    const [listResult, activeResult] = await Promise.all([
      businessesApi.list(true),
      businessesApi.getActive(),
    ]);

    if (!listResult.ok) {
      setBusinesses([]);
      setActive(null);
      setError(listResult.message);
      setStatus("error");
      return;
    }

    const rows = listResult.data.businesses;
    setBusinesses(rows);

    const live = rows.filter((row) => row.status === "active");
    if (live.length === 0) {
      setActive(null);
      setStatus(rows.length === 0 ? "empty" : "ready");
      return;
    }

    let nextActive =
      activeResult.ok && activeResult.data.business
        ? activeResult.data.business
        : null;

    if (
      !nextActive ||
      nextActive.status === "archived" ||
      !live.some((row) => row.id === nextActive?.id)
    ) {
      const preferred = live[0];
      const switched = await businessesApi.setActive(preferred.id);
      nextActive = switched.ok ? switched.data.business : preferred;
    }

    setActive(nextActive);
    setStatus("ready");
  }, [org, orgStatus]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchBusiness = React.useCallback(async (businessId: string) => {
    const result = await businessesApi.setActive(businessId);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setActive(result.data.business);
    setBusinesses((prev) => {
      const exists = prev.some((row) => row.id === result.data.business.id);
      return exists
        ? prev.map((row) =>
            row.id === result.data.business.id ? result.data.business : row,
          )
        : [...prev, result.data.business];
    });
    setStatus("ready");
    return true;
  }, []);

  const createBusiness = React.useCallback(
    async (input: CreateBusinessInput) => {
      const result = await businessesApi.create(input);
      if (!result.ok) {
        return { ok: false as const, message: result.message };
      }
      setBusinesses((prev) => {
        const without = prev.filter(
          (row) => row.id !== result.data.business.id,
        );
        return [...without, result.data.business];
      });
      setActive(result.data.business);
      setStatus("ready");
      return { ok: true as const, business: result.data.business };
    },
    [],
  );

  const value = React.useMemo<BusinessSessionContextValue>(
    () => ({
      status,
      businesses,
      active,
      error,
      refresh,
      switchBusiness,
      createBusiness,
    }),
    [
      status,
      businesses,
      active,
      error,
      refresh,
      switchBusiness,
      createBusiness,
    ],
  );

  return (
    <BusinessSessionContext.Provider value={value}>
      {children}
    </BusinessSessionContext.Provider>
  );
}

export function useBusinessSession(): BusinessSessionContextValue {
  const ctx = React.useContext(BusinessSessionContext);
  if (!ctx) {
    throw new Error(
      "useBusinessSession must be used within BusinessSessionProvider",
    );
  }
  return ctx;
}

export function useOptionalBusinessSession(): BusinessSessionContextValue | null {
  return React.useContext(BusinessSessionContext);
}
