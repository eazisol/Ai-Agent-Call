"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, Plus, Store } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { formatLanguage } from "@/lib/language-catalogue";
import {
  agentStatusBadge,
  agentsApi,
  canCreateAgent,
  elevenLabsMapping,
  formatAgentStatus,
  formatProviderSyncStatus,
  providerSyncStatusBadge,
  type Agent,
} from "@/lib/agents-api";

export default function AgentsPage() {
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canCreate = canCreateAgent(org?.role);

  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (bizStatus === "loading") {
      return;
    }
    if (!business || business.status === "archived") {
      setAgents([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await agentsApi.list(includeArchived);
    setLoading(false);
    if (!result.ok) {
      setAgents([]);
      setError(result.message);
      return;
    }
    setAgents(result.data.agents);
  }, [bizStatus, business, includeArchived]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (bizStatus === "loading" || (loading && business)) {
    return <LoadingState label="Loading agents…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="AI agents belong to a business. Create or switch to an active business first."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load agents"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  if (agents.length === 0) {
    return (
      <div className="space-y-6">
        <AgentsHeader
          businessName={business.name}
          canCreate={canCreate}
          includeArchived={includeArchived}
          onIncludeArchivedChange={setIncludeArchived}
        />
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description={`Create the first AI receptionist for ${business.name}.`}
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/agents/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Create agent
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask an owner, admin, or manager to create an agent.
              </p>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AgentsHeader
        businessName={business.name}
        canCreate={canCreate}
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => {
              const mapping = elevenLabsMapping(agent);
              const syncStatus = mapping?.syncStatus ?? "not_provisioned";
              return (
              <tr key={agent.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/agents/${agent.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {agent.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {agent.roleLabel}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {agent.useBusinessLanguageSettings
                    ? "Business defaults"
                    : agent.languages.map(formatLanguage).join(", ")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={agentStatusBadge(agent.status)}>
                    {formatAgentStatus(agent.status)}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={providerSyncStatusBadge(syncStatus)}>
                    {formatProviderSyncStatus(syncStatus)}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/agents/${agent.id}`}>Open</Link>
                  </Button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentsHeader({
  businessName,
  canCreate,
  includeArchived,
  onIncludeArchivedChange,
}: {
  businessName: string;
  canCreate: boolean;
  includeArchived: boolean;
  onIncludeArchivedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Receptionists for {businessName}.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={includeArchived}
            onChange={(e) => onIncludeArchivedChange(e.target.checked)}
          />
          Show archived
        </label>
      </div>
      {canCreate ? (
        <Button asChild>
          <Link href="/agents/new">
            <Plus className="size-4" aria-hidden="true" />
            Create agent
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
