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

  if (pathname === "/team") {
    return [{ label: "Team" }];
  }

  if (pathname === "/businesses") {
    return [{ label: "Businesses" }];
  }

  if (pathname === "/businesses/new") {
    return [
      { label: "Businesses", href: "/businesses" },
      { label: "Create" },
    ];
  }

  if (pathname.startsWith("/businesses/")) {
    const parts = pathname.split("/").filter(Boolean);
    const rawId = parts[1];
    const label =
      rawId && rawId.length > 12 ? `${rawId.slice(0, 8)}…` : rawId || "Business";
    const crumbs: Crumb[] = [
      { label: "Businesses", href: "/businesses" },
      { label, href: `/businesses/${rawId}` },
    ];
    if (parts[2] === "settings") {
      crumbs.push({ label: "Settings" });
    } else if (parts[2] === "hours") {
      crumbs.push({ label: "Hours" });
    }
    return crumbs;
  }

  if (pathname === "/agents") {
    return [{ label: "AI Agents" }];
  }

  if (pathname === "/agents/new") {
    return [
      { label: "AI Agents", href: "/agents" },
      { label: "Create" },
    ];
  }

  if (pathname.startsWith("/agents/")) {
    const parts = pathname.split("/").filter(Boolean);
    const rawId = parts[1];
    const label =
      rawId && rawId.length > 12 ? `${rawId.slice(0, 8)}…` : rawId || "Agent";
    const crumbs: Crumb[] = [
      { label: "AI Agents", href: "/agents" },
      { label, href: `/agents/${rawId}` },
    ];
    if (parts[2] === "behavior") {
      crumbs.push({ label: "Behavior" });
    } else if (parts[2] === "escalation") {
      crumbs.push({ label: "Escalation" });
    }
    return crumbs;
  }

  if (pathname === "/settings") {
    return [{ label: "Settings" }];
  }

  if (pathname === "/settings/organization") {
    return [
      { label: "Settings", href: "/settings" },
      { label: "Organization" },
    ];
  }

  if (pathname === "/onboarding/organization") {
    return [{ label: "Create organization" }];
  }

  return [{ label: "EaziAICall" }];
}
