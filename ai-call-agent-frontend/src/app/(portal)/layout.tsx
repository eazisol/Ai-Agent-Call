"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  AuthSessionProvider,
  RequireAuth,
} from "@/components/auth/auth-session";
import {
  OrganizationSessionProvider,
  RequireOrganization,
} from "@/components/organizations/organization-session";
import { PortalShell } from "@/components/shell/portal-shell";

/**
 * Customer Portal layout.
 * Auth → organization session → portal chrome (skipped for first-org onboarding).
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <RequireAuth>
        <OrganizationSessionProvider>
          <RequireOrganization>
            <PortalChrome>{children}</PortalChrome>
          </RequireOrganization>
        </OrganizationSessionProvider>
      </RequireAuth>
    </AuthSessionProvider>
  );
}

function PortalChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/onboarding/organization") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.02_250),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.28_0.03_250),transparent_55%)]"
        />
        <div className="relative z-10 w-full">{children}</div>
      </div>
    );
  }
  return <PortalShell>{children}</PortalShell>;
}
