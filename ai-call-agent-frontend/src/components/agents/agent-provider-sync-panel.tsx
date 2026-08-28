"use client";

import { useEffectTask } from "@/hooks/use-effect-task";
import * as React from "react";
import { RefreshCw } from "lucide-react";

import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import type { OrganizationRole } from "@/lib/organizations-api";
import {
  agentsApi,
  canSyncAgent,
  elevenLabsMapping,
  formatProviderSyncStatus,
  providerSyncStatusBadge,
  type Agent,
  type AgentProviderStatus,
  type AgentSyncResult,
} from "@/lib/agents-api";

type Props = {
  agent: Agent;
  role: OrganizationRole | undefined;
  onAgentUpdated: (agent: Agent) => void;
};

export function AgentProviderSyncPanel({
  agent,
  role,
  onAgentUpdated,
}: Props) {
  const canSync = canSyncAgent(role);
  const mapping = elevenLabsMapping(agent);

  const [status, setStatus] = React.useState<AgentProviderStatus | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [success, setSuccess] = React.useState<string | null>(null);

  const syncStatus =
    status?.syncStatus ?? mapping?.syncStatus ?? "not_provisioned";
  const lastError = status?.lastError ?? mapping?.lastError ?? null;
  const externalId =
    status?.externalAgentId ?? mapping?.externalAgentId ?? null;
  const lastSyncedAt =
    status?.lastSyncedAt ?? mapping?.lastSyncedAt ?? null;

  const loadStatus = React.useCallback(async () => {
    setStatusLoading(true);
    const result = await agentsApi.providerStatus(agent.id);
    setStatusLoading(false);
    if (!result.ok) {
      setStatus(null);
      return;
    }
    setStatus(result.data.status);
  }, [agent.id]);

  useEffectTask(loadStatus, [loadStatus]);

  const onSync = async () => {
    if (!canSync || agent.status === "archived") return;
    setSyncing(true);
    setError(null);
    setSuccess(null);
    setWarnings([]);
    const result = await agentsApi.sync(agent.id);
    setSyncing(false);
    if (!result.ok) {
      setError(result.message);
      void loadStatus();
      return;
    }
    const sync: AgentSyncResult = result.data.sync;
    onAgentUpdated(result.data.agent);
    setStatus({
      provider: sync.provider,
      syncStatus: sync.syncStatus,
      externalAgentId: sync.externalAgentId,
      lastSyncedAt: sync.lastSyncedAt,
      lastError: sync.lastError,
      remote: {
        checked: false,
        exists: null,
        name: null,
        rawStatus: null,
      },
    });
    setWarnings(sync.warnings ?? []);
    setSuccess(
      sync.syncStatus === "synced"
        ? "Voice provider synced successfully."
        : "Sync finished.",
    );
    void loadStatus();
  };

  const ctaLabel =
    syncStatus === "error"
      ? "Retry sync"
      : syncStatus === "synced"
        ? "Re-sync"
        : "Sync to ElevenLabs";

  return (
    <section
      className="rounded-xl border bg-card p-6"
      aria-labelledby="provider-sync-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="provider-sync-heading"
            className="text-sm font-semibold text-foreground"
          >
            Voice provider
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Push this agent’s local configuration to ElevenLabs. You can keep
            editing locally even if sync fails.
          </p>
        </div>
        <StatusBadge status={providerSyncStatusBadge(syncStatus)}>
          {statusLoading && !syncing
            ? "Checking…"
            : formatProviderSyncStatus(syncStatus)}
        </StatusBadge>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Provider
          </dt>
          <dd className="mt-1">ElevenLabs</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last synced
          </dt>
          <dd className="mt-1">
            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "—"}
          </dd>
        </div>
        {externalId ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Provider agent ID
            </dt>
            <dd className="mt-1 break-all font-mono text-xs">{externalId}</dd>
          </div>
        ) : null}
        {status?.remote.checked ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Remote check
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {status.remote.exists === true
                ? `Found on provider${status.remote.name ? ` (${status.remote.name})` : ""}`
                : status.remote.exists === false
                  ? "Not found on provider — try re-sync"
                  : status.remote.rawStatus === "check_failed"
                    ? "Could not verify remote status right now"
                    : "—"}
            </dd>
          </div>
        ) : null}
      </dl>

      {syncStatus === "not_provisioned" && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Not synced yet. Sync when you are ready to provision this receptionist
          on ElevenLabs.
        </p>
      ) : null}

      {lastError && syncStatus === "error" ? (
        <div
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
          role="alert"
        >
          {lastError}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-destructive-strong" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 text-sm text-success-strong" role="status">
          {success}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-strong">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {canSync && agent.status !== "archived" ? (
          <Button
            type="button"
            disabled={syncing}
            onClick={() => void onSync()}
          >
            <RefreshCw
              className={`mr-1.5 size-3.5 ${syncing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {syncing ? "Syncing…" : ctaLabel}
          </Button>
        ) : null}
        {canSync && agent.status === "archived" ? (
          <p className="text-sm text-muted-foreground">
            Unarchive the agent before syncing to the voice provider.
          </p>
        ) : null}
        {!canSync ? (
          <p className="text-sm text-muted-foreground">
            You can view sync status. Ask an owner, admin, or manager to sync.
          </p>
        ) : null}
      </div>
    </section>
  );
}
