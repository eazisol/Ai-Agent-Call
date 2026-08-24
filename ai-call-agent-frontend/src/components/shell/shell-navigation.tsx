"use client";

import * as React from "react";

/**
 * ShellNavigation — framework-agnostic navigation bridge for the shell.
 *
 * The shell never imports a router. The host app provides the current
 * path and a navigate function via ShellNavigationProvider
 * (Next.js: usePathname + router.push in portal-shell adapter).
 */
export interface ShellNavigationValue {
  /** Current pathname, e.g. "/dashboard". Drives active nav states. */
  currentPath: string;
  /** Request navigation to an href. Host decides how (push, toast, noop). */
  navigate: (href: string) => void;
}

const ShellNavigationContext = React.createContext<ShellNavigationValue>({
  currentPath: "/",
  navigate: () => undefined,
});

export function ShellNavigationProvider({
  value,
  children,
}: {
  value: ShellNavigationValue;
  children: React.ReactNode;
}) {
  return (
    <ShellNavigationContext.Provider value={value}>{children}</ShellNavigationContext.Provider>
  );
}

export function useShellNavigation() {
  return React.useContext(ShellNavigationContext);
}
