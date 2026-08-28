"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen } from "lucide-react";

import { AgentSubnav } from "@/components/agents/agent-subnav";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { agentsApi, type Agent } from "@/lib/agents-api";
import {
  canAssignKnowledge,
  elevenLabsKnowledgeMapping,
  formatKnowledgeType,
  formatSyncStatus,
  knowledgeApi,
  syncStatusBadge,
  type KnowledgeSource,
} from "@/lib/knowledge-api";

export default function AgentKnowledgePage() {
  const params = useParams();
  const agentId = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { active: business } = useBusinessSession();
  const canAssign = canAssignKnowledge(org?.role);

  const [agent, setAgent] = React.useState<Agent | null>(null);
  const [library, setLibrary] = React.useState<KnowledgeSource[]>([]);
  const [assignedIds, setAssignedIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);

    const [agentResult, libraryResult, assignedResult] = await Promise.all([
      agentsApi.get(agentId),
      knowledgeApi.list(false),
      knowledgeApi.listAgentKnowledge(agentId),
    ]);

    setLoading(false);

    if (!agentResult.ok) {
      setAgent(null);
      setError(agentResult.message);
      return;
    }
    setAgent(agentResult.data.agent);

    if (!libraryResult.ok) {
      setLibrary([]);
      setError(libraryResult.message);
      return;
    }
    setLibrary(libraryResult.data.sources.filter((s) => s.status === "active"));

    if (!assignedResult.ok) {
      setAssignedIds(new Set());
      setError(assignedResult.message);
      return;
    }
    setAssignedIds(
      new Set(
        assignedResult.data.assignments.map((row) => row.knowledge.id),
      ),
    );
  }, [agentId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (knowledgeId: string, nextChecked: boolean) => {
    if (!canAssign || !agentId) return;
    setBusyId(knowledgeId);
    setError(null);
    setMessage(null);

    const result = nextChecked
      ? await knowledgeApi.assignToAgent(agentId, knowledgeId)
      : await knowledgeApi.unassignFromAgent(agentId, knowledgeId);

    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (nextChecked) next.add(knowledgeId);
      else next.delete(knowledgeId);
      return next;
    });
    setMessage(
      nextChecked ? "Knowledge assigned." : "Knowledge unassigned.",
    );
  };

  if (loading) {
    return <LoadingState label="Loading agent knowledge…" />;
  }

  if (!agent) {
    return (
      <ErrorState
        title="Agent not found"
        description={error ?? "Unavailable."}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <AgentSubnav agentId={agent.id} active="knowledge" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign shared sources from{" "}
            {business?.name ?? "this business"} to {agent.name}. Sources are
            not re-uploaded per agent.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/knowledge">Manage Business Knowledge</Link>
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-success-strong" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive-strong" role="alert">
          {error}
        </p>
      ) : null}

      {!canAssign ? (
        <p className="text-sm text-muted-foreground">
          You can view assignments. Ask an owner, admin, or manager to change
          them.
        </p>
      ) : null}

      {library.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No knowledge in this business yet"
          description="Create shared knowledge first, then assign it to this agent."
          action={
            <Button asChild>
              <Link href="/knowledge/new">Create knowledge</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Sync</th>
              </tr>
            </thead>
            <tbody>
              {library.map((source) => {
                const checked = assignedIds.has(source.id);
                const mapping = elevenLabsKnowledgeMapping(source);
                const syncStatus = mapping?.syncStatus ?? "not_provisioned";
                return (
                  <tr key={source.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={checked}
                        disabled={!canAssign || busyId === source.id}
                        aria-label={`Assign ${source.name}`}
                        onChange={(e) =>
                          void toggle(source.id, e.target.checked)
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/knowledge/${source.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {source.name}
                      </Link>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {library.length > 0 && assignedIds.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sources assigned yet. Check the boxes above to attach knowledge to
          this agent.
        </p>
      ) : null}
    </div>
  );
}
