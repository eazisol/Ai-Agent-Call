import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/patterns";

export const metadata = {
  title: "Admin Overview",
  description: "Manage customers, AI agents, providers, billing and platform operations.",
};

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">
          Manage customers, AI agents, providers, billing and platform operations.
        </p>
      </div>
      <EmptyState
        icon={ShieldCheck}
        title="Administrative controls and platform metrics will appear here."
        description="KPIs, tables and operational tooling arrive in later vertical slices."
      />
    </div>
  );
}
