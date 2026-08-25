import type { ReactNode } from "react";

import {
  AuthSessionProvider,
  RequireAuth,
} from "@/components/auth/auth-session";
import { PortalShell } from "@/components/shell/portal-shell";

/**
 * Customer Portal layout — wraps business routes in the approved AppShell.
 * Route group `(portal)` does not affect URLs: /dashboard, /calls, /settings.
 * M01: session restore + redirect unauthenticated users to /login.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <RequireAuth>
        <PortalShell>{children}</PortalShell>
      </RequireAuth>
    </AuthSessionProvider>
  );
}
