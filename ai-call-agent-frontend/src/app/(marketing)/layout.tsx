import type { ReactNode } from "react";

import { MarketingShellHost } from "@/components/public/marketing-shell-host";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShellHost>{children}</MarketingShellHost>;
}
