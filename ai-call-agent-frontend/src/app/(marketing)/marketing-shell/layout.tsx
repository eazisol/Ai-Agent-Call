import type { ReactNode } from "react";
import { MarketingShellHost } from "@/components/public/marketing-shell-host";

/**
 * Public / Marketing shell foundation layout.
 * Public URL: /marketing-shell (does not replace `/` → `/dashboard`).
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShellHost>{children}</MarketingShellHost>;
}
