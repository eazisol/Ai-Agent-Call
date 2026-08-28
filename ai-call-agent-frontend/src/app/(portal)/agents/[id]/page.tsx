"use client";

import { useEffectTask } from "@/hooks/use-effect-task";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { AgentSubnav } from "@/components/agents/agent-subnav";
import { AgentProviderSyncPanel } from "@/components/agents/agent-provider-sync-panel";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { formatLanguage } from "@/lib/language-catalogue";
import {
  agentStatusBadge,
  agentsApi,
  canActivateAgent,
  canArchiveAgent,
  canDeleteAgent,
  formatAgentStatus,
  type Agent,
} from "@/lib/agents-api";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { active: business } = useBusinessSession();

  const canActivate = canActivateAgent(org?.role);
  const canArchive = canArchiveAgent(org?.role);
  const canDelete = canDeleteAgent(org?.role);

  const [agent, setAgent] = React.useState<Agent | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const result = await agentsApi.get(id);
    setLoading(false);
    if (!result.ok) {
      setAgent(null);
      setError(result.message);
      return;
    }
    setAgent(result.data.agent);
  }, [id]);

  useEffectTask(load, [load]);

  const runAction = async (
    action: () => ReturnType<typeof agentsApi.activate>,
    success: string,
  ) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAgent(result.data.agent);
    setMessage(success);
  };

  const onDelete = async () => {
    if (!agent || !canDelete) return;
    if (
      !window.confirm(
        `Permanently delete “${agent.name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await agentsApi.remove(agent.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push("/agents");
  };

  if (loading) {
    return <LoadingState label="Loading agent…" />;
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

  const languageSummary = agent.useBusinessLanguageSettings
    ? "Uses business language settings"
    : agent.languageMode === "single"
      ? `Single: ${formatLanguage(agent.language)}`
      : `Multilingual: ${agent.languages.map(formatLanguage).join(", ")}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <AgentSubnav agentId={agent.id} active="overview" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {agent.name}
            </h1>
            <StatusBadge status={agentStatusBadge(agent.status)}>
              {formatAgentStatus(agent.status)}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {agent.roleLabel}
            {business ? ` · ${business.name}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canActivate && agent.status === "inactive" ? (
            <Button
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => agentsApi.activate(agent.id),
                  "Agent activated.",
                )
              }
            >
              Activate
            </Button>
          ) : null}
          {canActivate && agent.status === "active" ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => agentsApi.deactivate(agent.id),
                  "Agent deactivated.",
                )
              }
            >
              Deactivate
            </Button>
          ) : null}
          {canArchive && agent.status !== "archived" ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => agentsApi.archive(agent.id),
                  "Agent archived.",
                )
              }
            >
              Archive
            </Button>
          ) : null}
          {canArchive && agent.status === "archived" ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () =>
                    agentsApi.update(agent.id, {
                      status: "inactive",
                    }),
                  "Agent unarchived (inactive).",
                )
              }
            >
              Unarchive
            </Button>
          ) : null}
        </div>
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

      <dl className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <Detail label="Languages" value={languageSummary} />
        <Detail
          label="Voice preference"
          value={
            agent.voicePreference === "female"
              ? "Female"
              : agent.voicePreference === "male"
                ? "Male"
                : "Neutral / Any"
          }
        />
        <Detail
          label="Escalation"
          value={agent.escalationEnabled ? "Enabled (stub)" : "Off"}
        />
        <Detail
          label="Updated"
          value={new Date(agent.updatedAt).toLocaleString()}
        />
        <div className="sm:col-span-2">
          <Detail label="Greeting" value={agent.greeting} />
        </div>
      </dl>

      <AgentProviderSyncPanel
        agent={agent}
        role={org?.role}
        onAgentUpdated={setAgent}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/agents/${agent.id}/behavior`}>Edit behavior</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/agents/${agent.id}/escalation`}>Escalation settings</Link>
        </Button>
        {canDelete ? (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Delete permanently
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
        {value}
      </dd>
    </div>
  );
}
