import type { ReactNode } from "react";

import {
  AuthSessionProvider,
  RedirectIfAuthenticated,
} from "@/components/auth/auth-session";

/**
 * Public authentication surfaces — no portal chrome.
 * Authenticated visitors are sent to the dashboard.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <RedirectIfAuthenticated>
        <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.02_250),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.28_0.03_250),transparent_55%)]"
          />
          <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
      </RedirectIfAuthenticated>
    </AuthSessionProvider>
  );
}
