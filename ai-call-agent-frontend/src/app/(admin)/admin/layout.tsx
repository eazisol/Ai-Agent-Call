import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/admin-shell";

/**
 * Internal Admin Portal layout.
 * Route group `(admin)` + nested `admin/` → public URL `/admin`.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
