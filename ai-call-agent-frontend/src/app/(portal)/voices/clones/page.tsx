"use client";

import * as React from "react";
import Link from "next/link";
import { AudioLines, Plus, Store } from "lucide-react";

import { useBusinessSession } from "@/components/businesses/business-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { useEffectTask } from "@/hooks/use-effect-task";
import {
  canCreateVoiceClone,
  canDeleteVoiceClone,
  canRevokeVoiceClone,
  formatVoiceCloneStatus,
  voiceCloneStatusBadge,
  voiceClonesApi,
  type VoiceCloneSummary,
} from "@/lib/voice-clones-api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function VoiceClonesPage() {
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canCreate = canCreateVoiceClone(org?.role);
  const canRevoke = canRevokeVoiceClone(org?.role);
  const canDelete = canDeleteVoiceClone(org?.role);

  const [clones, setClones] = React.useState<VoiceCloneSummary[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (bizStatus === "loading") {
      return;
    }
    if (!business || business.status === "archived") {
      setClones([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await voiceClonesApi.list({ limit: 50 });
    setLoading(false);
    if (!result.ok) {
      setClones([]);
      setTotal(0);
      setError(result.message);
      return;
    }
    setClones(result.data.clones);
    setTotal(result.data.total);
  }, [bizStatus, business]);

  useEffectTask(load, [load]);

  const onRevoke = async (clone: VoiceCloneSummary) => {
    if (!canRevoke || clone.status !== "ready") return;
    const assigned = clone.assignedAgentCount > 0;
    const message = assigned
      ? `Revoke “${clone.displayName}”? ${clone.assignedAgentCount} agent(s) still use this voice. It will be removed from the assign picker but existing assignments may need to be cleared.`
      : `Revoke “${clone.displayName}”? It will no longer appear in the voice library.`;
    if (!window.confirm(message)) return;

    setBusyId(clone.id);
    setActionError(null);
    const result = await voiceClonesApi.revoke(clone.id);
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    void load();
  };

  const onDelete = async (clone: VoiceCloneSummary) => {
    if (!canDelete) return;
    if (clone.status === "processing") return;

    const assigned = clone.assignedAgentCount > 0;
    const message = assigned
      ? `“${clone.displayName}” is assigned to ${clone.assignedAgentCount} agent(s). Delete will fail until you unassign it from every agent. Continue anyway?`
      : `Permanently delete “${clone.displayName}”? This cannot be undone.`;
    if (!window.confirm(message)) return;

    setBusyId(clone.id);
    setActionError(null);
    const result = await voiceClonesApi.remove(clone.id);
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    void load();
  };

  if (bizStatus === "loading" || (loading && business)) {
    return <LoadingState label="Loading custom voices…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Custom voice clones belong to your active business."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (error && clones.length === 0) {
    return (
      <ErrorState
        title="Could not load custom voices"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Custom voice clones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Business-owned voices for {business.name}. Create once and assign
            the same clone to multiple agents from the{" "}
            <Link href="/voices" className="text-info-strong underline-offset-4 hover:underline">
              Voice Library
            </Link>
            .
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/voices/clones/new">
              <Plus className="size-4" aria-hidden="true" />
              Create custom voice
            </Link>
          </Button>
        ) : null}
      </div>

      {actionError ? (
        <p className="text-sm text-destructive-strong" role="alert">
          {actionError}
        </p>
      ) : null}

      {clones.length === 0 ? (
        <EmptyState
          icon={AudioLines}
          title="No custom voices yet"
          description={
            canCreate
              ? "Upload voice samples with consent to create a reusable clone for your agents."
              : "Your team has not created any custom voice clones for this business."
          }
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/voices/clones/new">Create custom voice</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/voices">Browse voice library</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {clones.length} of {total} clone{total === 1 ? "" : "s"}.
          </p>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Agents</th>
                  <th className="px-4 py-3 font-medium">Samples</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clones.map((clone) => (
                  <tr key={clone.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/voices/clones/${clone.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {clone.displayName}
                      </Link>
                      {clone.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {clone.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={voiceCloneStatusBadge(clone.status)}>
                        {formatVoiceCloneStatus(clone.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">{clone.assignedAgentCount}</td>
                    <td className="px-4 py-3">{clone.sampleCount}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(clone.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/voices/clones/${clone.id}`}>View</Link>
                        </Button>
                        {canRevoke && clone.status === "ready" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === clone.id}
                            onClick={() => void onRevoke(clone)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                        {canDelete &&
                        (clone.status === "draft" ||
                          clone.status === "failed" ||
                          clone.status === "revoked") ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busyId === clone.id}
                            onClick={() => void onDelete(clone)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
