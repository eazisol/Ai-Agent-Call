"use client";

import * as React from "react";

import { useOptionalOrganizationSession } from "@/components/organizations/organization-session";
import {
  subscriptionsApi,
  type EntitlementsView,
  type SubscriptionView,
} from "@/lib/subscriptions-api";

export type SubscriptionLoadState = "idle" | "loading" | "ready" | "error";

export type SubscriptionSnapshot = {
  status: SubscriptionLoadState;
  subscription: SubscriptionView | null;
  entitlements: EntitlementsView | null;
  error: string | null;
  errorCode?: string;
  refresh: () => Promise<void>;
};

const SubscriptionContext = React.createContext<SubscriptionSnapshot | null>(
  null,
);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgSession = useOptionalOrganizationSession();
  const orgId = orgSession?.active?.id ?? null;
  const [status, setStatus] = React.useState<SubscriptionLoadState>("idle");
  const [subscription, setSubscription] =
    React.useState<SubscriptionView | null>(null);
  const [entitlements, setEntitlements] =
    React.useState<EntitlementsView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | undefined>();
  const [tick, setTick] = React.useState(0);

  const refresh = React.useCallback(async () => {
    setTick((value) => value + 1);
  }, []);

  React.useEffect(() => {
    if (!orgId) {
      setStatus("idle");
      setSubscription(null);
      setEntitlements(null);
      setError(null);
      setErrorCode(undefined);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);
    setErrorCode(undefined);

    void (async () => {
      const [subResult, entResult] = await Promise.all([
        subscriptionsApi.getSubscription(),
        subscriptionsApi.getEntitlements(),
      ]);
      if (cancelled) {
        return;
      }
      if (!subResult.ok) {
        setStatus("error");
        setSubscription(null);
        setEntitlements(null);
        setError(subResult.message);
        setErrorCode(subResult.code);
        return;
      }
      setSubscription(subResult.data);
      if (entResult.ok) {
        setEntitlements(entResult.data);
      } else {
        setEntitlements(null);
      }
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, tick]);

  const value = React.useMemo<SubscriptionSnapshot>(
    () => ({
      status,
      subscription,
      entitlements,
      error,
      errorCode,
      refresh,
    }),
    [status, subscription, entitlements, error, errorCode, refresh],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionSnapshot(): SubscriptionSnapshot {
  const ctx = React.useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      "useSubscriptionSnapshot must be used within SubscriptionProvider",
    );
  }
  return ctx;
}

export function useOptionalSubscriptionSnapshot(): SubscriptionSnapshot | null {
  return React.useContext(SubscriptionContext);
}

/** Presentation-only feature check — backend still enforces. */
export function hasFeature(
  entitlements: EntitlementsView | null,
  key: string,
): boolean {
  return entitlements?.features?.[key] === true;
}

/** Presentation-only limit read — `null` means unlimited / omitted. */
export function getLimit(
  entitlements: EntitlementsView | null,
  key: string,
): number | null {
  if (!entitlements?.limits || !(key in entitlements.limits)) {
    return null;
  }
  return entitlements.limits[key] ?? null;
}
