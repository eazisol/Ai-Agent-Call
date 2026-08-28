"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AudioLines } from "lucide-react";

import { AgentSubnav } from "@/components/agents/agent-subnav";
import { AgentProviderSyncPanel } from "@/components/agents/agent-provider-sync-panel";
import { VoicePreviewButton } from "@/components/voices/voice-preview-button";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { useEffectTask } from "@/hooks/use-effect-task";
import { formatLanguage } from "@/lib/language-catalogue";
import { agentsApi, canSyncAgent, type Agent } from "@/lib/agents-api";
import {
  canAssignAgentVoice,
  formatGenderPresentation,
  formatVoiceSourceType,
  voicesApi,
  type AgentVoiceAssignment,
  type VoiceSummary,
} from "@/lib/voices-api";

export default function AgentVoicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectVoiceId = searchParams.get("voiceId");

  const agentId = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { active: business } = useBusinessSession();
  const canAssign = canAssignAgentVoice(org?.role);
  const canSync = canSyncAgent(org?.role);

  const [agent, setAgent] = React.useState<Agent | null>(null);
  const [assignment, setAssignment] =
    React.useState<AgentVoiceAssignment | null>(null);
  const [library, setLibrary] = React.useState<VoiceSummary[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = React.useState<string | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[]>([]);

  const load = React.useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);

    const [agentResult, assignmentResult, libraryResult] = await Promise.all([
      agentsApi.get(agentId),
      voicesApi.getAgentVoice(agentId),
      voicesApi.list({ limit: 50 }),
    ]);

    setLoading(false);

    if (!agentResult.ok) {
      setAgent(null);
      setError(agentResult.message);
      return;
    }
    setAgent(agentResult.data.agent);

    if (!assignmentResult.ok) {
      setAssignment(null);
      setError(assignmentResult.message);
      return;
    }
    setAssignment(assignmentResult.data.assignment);
    setSelectedVoiceId(
      preselectVoiceId ?? assignmentResult.data.assignment.voiceId,
    );
    setWarnings(assignmentResult.data.assignment.warnings);

    if (!libraryResult.ok) {
      setLibrary([]);
      setError(libraryResult.message);
      return;
    }
    setLibrary(libraryResult.data.voices);
  }, [agentId, preselectVoiceId]);

  useEffectTask(load, [load]);

  const selectedVoice =
    library.find((v) => v.id === selectedVoiceId) ??
    assignment?.voice ??
    null;

  const save = async () => {
    if (!canAssign || !agentId || !selectedVoiceId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await voicesApi.assignAgentVoice(agentId, selectedVoiceId);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAssignment(result.data.assignment);
    setWarnings(result.data.assignment.warnings);
    setMessage("Voice saved. Sync the agent to apply it on the provider.");
    if (preselectVoiceId) {
      router.replace(`/agents/${agentId}/voice`);
    }
    const agentRefresh = await agentsApi.get(agentId);
    if (agentRefresh.ok) {
      setAgent(agentRefresh.data.agent);
    }
  };

  const clear = async () => {
    if (!canAssign || !agentId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await voicesApi.clearAgentVoice(agentId);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAssignment(result.data.assignment);
    setSelectedVoiceId(null);
    setWarnings([]);
    setMessage("Voice cleared. Provider sync will fall back to preference.");
    const agentRefresh = await agentsApi.get(agentId);
    if (agentRefresh.ok) {
      setAgent(agentRefresh.data.agent);
    }
  };

  if (loading) {
    return <LoadingState label="Loading agent voice…" />;
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
      <AgentSubnav agentId={agent.id} active="voice" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Voice</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose one shared voice for {agent.name}. Other agents in{" "}
            {business?.name ?? "this business"} can reuse the same voice.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/voices?pickFor=${agent.id}`}>Browse library</Link>
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

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Current selection</h2>
        {assignment?.voice || selectedVoice ? (
          <CurrentVoiceSummary voice={selectedVoice ?? assignment!.voice!} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Not selected — using presentation preference (
            {formatGenderPresentation(
              assignment?.voicePreference as
                | "female"
                | "male"
                | "neutral"
                | undefined,
            )}{" "}
            ) until you assign a library voice.
          </p>
        )}
        {warnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-warning-strong">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {canAssign ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              disabled={busy || !selectedVoiceId}
              onClick={() => void save()}
            >
              Save voice
            </Button>
            {assignment?.voiceId ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void clear()}
              >
                Clear assignment
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can view the assignment. Ask an owner, admin, or manager to
            change it.
          </p>
        )}
      </section>

      {canSync && agent ? (
        <AgentProviderSyncPanel
          agent={agent}
          role={org?.role}
          onAgentUpdated={setAgent}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Pick from library</h2>
        <p className="text-xs text-muted-foreground">
          Voices are shared business assets — assigning Sarah to this agent does
          not create a second copy for another agent.
        </p>

        {library.length === 0 ? (
          <EmptyState
            icon={AudioLines}
            title="No voices available"
            description="Configure ElevenLabs on the server or adjust filters in the library."
            action={
              <Button variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium"> </th>
                  <th className="px-4 py-3 font-medium">Voice</th>
                  <th className="px-4 py-3 font-medium">Presentation</th>
                  <th className="px-4 py-3 font-medium">Languages</th>
                  <th className="px-4 py-3 font-medium">Preview</th>
                </tr>
              </thead>
              <tbody>
                {library.map((voice) => {
                  const checked = selectedVoiceId === voice.id;
                  const isAssigned = assignment?.voiceId === voice.id;
                  return (
                    <tr key={voice.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          name="agent-voice-pick"
                          className="size-4"
                          checked={checked}
                          disabled={!canAssign || busy}
                          aria-label={`Select ${voice.displayName}`}
                          onChange={() => setSelectedVoiceId(voice.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{voice.displayName}</span>
                        {isAssigned ? (
                          <StatusBadge status="success" className="ml-2">
                            Assigned
                          </StatusBadge>
                        ) : null}
                        {voice.sourceType === "business_clone" ? (
                          <StatusBadge status="info" className="ml-2">
                            Custom
                          </StatusBadge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatGenderPresentation(voice.genderPresentation)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {voice.languageCodes.map(formatLanguage).join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        <VoicePreviewButton
                          voiceId={voice.id}
                          previewAudioUrl={voice.previewAudioUrl}
                          sampleText={voice.previewSampleText}
                          disabled={busy}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CurrentVoiceSummary({ voice }: { voice: VoiceSummary }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{voice.displayName}</p>
      <p className="text-muted-foreground">
        {formatGenderPresentation(voice.genderPresentation)}
        {voice.accent ? ` · ${voice.accent}` : ""} ·{" "}
        {formatVoiceSourceType(voice.sourceType)}
      </p>
      <VoicePreviewButton
        voiceId={voice.id}
        previewAudioUrl={voice.previewAudioUrl}
        sampleText={voice.previewSampleText}
      />
    </div>
  );
}
