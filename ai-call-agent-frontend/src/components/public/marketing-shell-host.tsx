"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { PublicShell } from "@/components/public/public-shell";
import { ShellNavigationProvider } from "@/components/shell/shell-navigation";
import { toastComingSoon } from "@/components/shell/portal-nav";

/** Live marketing foundation routes in Phase 4. */
export function isEnabledMarketingRoute(href: string): boolean {
  return href === "/marketing-shell";
}

/**
 * Next.js host adapter for the Public / Marketing shell preview.
 *
 * MarketingShellHost
 *   → ShellNavigationProvider
 *     → PublicShell
 *       → {children}
 */
export function MarketingShellHost({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/marketing-shell";
  const router = useRouter();

  const navigate = React.useCallback(
    (href: string) => {
      if (isEnabledMarketingRoute(href)) {
        router.push(href);
        return;
      }
      toastComingSoon();
    },
    [router],
  );

  const navigationValue = React.useMemo(
    () => ({ currentPath: pathname, navigate }),
    [pathname, navigate],
  );

  return (
    <ShellNavigationProvider value={navigationValue}>
      <PublicShell>{children}</PublicShell>
    </ShellNavigationProvider>
  );
}
