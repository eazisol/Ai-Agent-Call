"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { PhoneCall } from "lucide-react";

import { PlatformShell } from "./platform-shell";
import { ShellNavigationProvider } from "./shell-navigation";
import { toastComingSoon } from "./portal-nav";
import {
  adminBottomNav,
  adminNavGroups,
  adminNotifications,
  adminSearchResults,
  adminUser,
} from "@/mocks/admin-shell";

/** Live Admin App Router routes in Phase 4. */
export function isEnabledAdminRoute(href: string): boolean {
  return href === "/admin";
}

/**
 * Next.js host adapter for the Internal Admin Portal shell.
 *
 * AdminShell
 *   → ShellNavigationProvider
 *     → PlatformShell
 *       → {children}
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();

  const navigate = React.useCallback(
    (href: string) => {
      if (isEnabledAdminRoute(href)) {
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

  const breadcrumbs = React.useMemo(() => {
    if (pathname === "/admin") {
      return [{ label: "Admin" }, { label: "Overview" }];
    }
    return [{ label: "Admin" }];
  }, [pathname]);

  const navigationValue = React.useMemo(
    () => ({ currentPath: pathname, navigate }),
    [pathname, navigate],
  );

  return (
    <ShellNavigationProvider value={navigationValue}>
      <PlatformShell
        brand={{
          label: "EaziAICall",
          badge: "Admin",
          icon: PhoneCall,
          homeHref: "/admin",
        }}
        navGroups={adminNavGroups}
        bottomGroups={[adminBottomNav]}
        user={adminUser}
        notifications={adminNotifications}
        searchGroups={adminSearchResults}
        searchPlaceholder="Search organizations, users, calls, provider IDs…"
        breadcrumbs={breadcrumbs}
        contentClassName="max-w-7xl"
      >
        {children}
      </PlatformShell>
    </ShellNavigationProvider>
  );
}
