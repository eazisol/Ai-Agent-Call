import type { ReactNode } from "react";
import { PortalShell } from "@/components/shell/portal-shell";

/**
 * Customer Portal layout — wraps business routes in the approved AppShell.
 * Route group `(portal)` does not affect URLs: /dashboard, /calls, /settings.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
