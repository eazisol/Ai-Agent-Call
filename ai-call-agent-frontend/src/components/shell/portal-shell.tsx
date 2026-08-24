"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { AppShell } from "./app-shell";
import { ShellNavigationProvider } from "./shell-navigation";
import type { Crumb } from "./breadcrumbs";
import { isEnabledPortalRoute, toastComingSoon } from "./portal-nav";

/**
 * Next.js host adapter for the Customer Portal shell.
 *
 * Concentrates next/navigation usage here so shell components stay
 * framework-portable via ShellNavigationProvider.
 *
 * NextPortalNavigationProvider
 *   → ShellNavigationProvider
 *     → AppShell
 *       → {children} (may be Server Components, e.g. Calls pages)
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/dashboard";
  const router = useRouter();
  const params = useParams();

  const navigate = React.useCallback(
    (href: string) => {
      if (isEnabledPortalRoute(href)) {
        router.push(href);
        return;
      }
      toastComingSoon();
    },
    [router],
  );

  React.useEffect(() => {
    try {
      if (localStorage.getItem("eaziaicall-theme") === "dark") {
        document.documentElement.classList.add("dark");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const breadcrumbs = React.useMemo(
    () => buildPortalBreadcrumbs(pathname, params),
    [pathname, params],
  );

  const navigationValue = React.useMemo(
    () => ({ currentPath: pathname, navigate }),
    [pathname, navigate],
  );

  return (
    <ShellNavigationProvider value={navigationValue}>
      <AppShell breadcrumbs={breadcrumbs}>{children}</AppShell>
    </ShellNavigationProvider>
  );
}

function buildPortalBreadcrumbs(
  pathname: string,
  params: ReturnType<typeof useParams>,
): Crumb[] {
  if (pathname === "/dashboard" || pathname === "/") {
    return [{ label: "Dashboard" }];
  }

  if (pathname === "/calls") {
    return [{ label: "Calls" }];
  }

  if (pathname.startsWith("/calls/")) {
    const rawId = typeof params?.id === "string" ? params.id : pathname.split("/")[2];
    const label =
      rawId && rawId.length > 12 ? `${rawId.slice(0, 8)}…` : rawId || "Call detail";
    return [{ label: "Calls", href: "/calls" }, { label }];
  }

  if (pathname === "/settings") {
    return [{ label: "Settings" }];
  }

  return [{ label: "EaziAICall" }];
}
