"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Plus, Store } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { useEffectTask } from "@/hooks/use-effect-task";
import {
  canCreateKnowledge,
  elevenLabsKnowledgeMapping,
  formatKnowledgeType,
  formatSyncStatus,
  knowledgeApi,
  syncStatusBadge,
  type KnowledgeSource,
} from "@/lib/knowledge-api";

export default function KnowledgePage() {
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canCreate = canCreateKnowledge(org?.role);

  const [sources, setSources] = React.useState<KnowledgeSource[]>([]);
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (bizStatus === "loading") {
      return;
    }
    if (!business || business.status === "archived") {
      setSources([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await knowledgeApi.list(includeArchived);
    setLoading(false);
    if (!result.ok) {
      setSources([]);
      setError(result.message);
      return;
    }
    setSources(result.data.sources);
  }, [bizStatus, business, includeArchived]);

  useEffectTask(load, [load]);

  if (bizStatus === "loading" || (loading && business)) {
    return <LoadingState label="Loading knowledge…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Knowledge sources belong to a business. Create or switch to an active business first."
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
        title="Could not load knowledge"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  if (sources.length === 0) {
    return (
      <div className="space-y-6">
        <KnowledgeHeader
          businessName={business.name}
          canCreate={canCreate}
          includeArchived={includeArchived}
          onIncludeArchivedChange={setIncludeArchived}
        />
        <EmptyState
          icon={BookOpen}
          title="No knowledge sources yet"
          description={`Add files, URLs, text, or FAQs that agents for ${business.name} can share.`}
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/knowledge/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Create knowledge
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask an owner, admin, or manager to add knowledge.
              </p>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KnowledgeHeader
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
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Sync</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => {
              const mapping = elevenLabsKnowledgeMapping(source);
              const syncStatus = mapping?.syncStatus ?? "not_provisioned";
              return (
                <tr key={source.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/knowledge/${source.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {source.name}
                    </Link>
                    {source.status === "archived" ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Archived
                      </span>
                    ) : null}
                    {source.needsSync ? (
                      <span className="ml-2 text-xs text-warning-strong">
                        Needs sync
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatKnowledgeType(source.type)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={syncStatusBadge(syncStatus)}>
                      {formatSyncStatus(syncStatus)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {source.assignedAgentCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/knowledge/${source.id}`}>Open</Link>
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

function KnowledgeHeader({
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
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared library for {businessName}.
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
          <Link href="/knowledge/new">
            <Plus className="size-4" aria-hidden="true" />
            Create knowledge
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
