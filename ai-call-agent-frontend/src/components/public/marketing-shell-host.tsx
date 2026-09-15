"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { PublicShell } from "@/components/public/public-shell";
import { ShellNavigationProvider } from "@/components/shell/shell-navigation";
import { isEnabledMarketingRoute } from "@/lib/marketing-routes";

export { isEnabledMarketingRoute };

/**
 * Marketing shell host — real Next.js navigation for launch routes + auth.
 */
export function MarketingShellHost({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const navigate = React.useCallback(
    (href: string) => {
      if (!isEnabledMarketingRoute(href)) {
        return;
      }
      router.push(href);
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
