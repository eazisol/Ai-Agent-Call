"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AudioLines, Mic2, Store } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { VoicePreviewButton } from "@/components/voices/voice-preview-button";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { useEffectTask } from "@/hooks/use-effect-task";
import { formatLanguage } from "@/lib/language-catalogue";
import { canCreateVoiceClone } from "@/lib/voice-clones-api";
import {
  formatGenderPresentation,
  formatVoiceSourceType,
  voicesApi,
  type VoiceGenderPresentation,
  type VoiceSourceType,
  type VoiceSummary,
} from "@/lib/voices-api";

export default function VoicesPage() {
  const searchParams = useSearchParams();
  const pickForAgentId = searchParams.get("pickFor") ?? undefined;

  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canCreateClone = canCreateVoiceClone(org?.role);

  const [voices, setVoices] = React.useState<VoiceSummary[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [q, setQ] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [genderPresentation, setGenderPresentation] = React.useState<
    VoiceGenderPresentation | ""
  >("");
  const [accent, setAccent] = React.useState("");
  const [sourceType, setSourceType] = React.useState<VoiceSourceType | "">("");

  const load = React.useCallback(async () => {
    if (bizStatus === "loading") {
      return;
    }
    if (!business || business.status === "archived") {
      setVoices([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await voicesApi.list({
      q: q || undefined,
      language: language || undefined,
      genderPresentation: genderPresentation || undefined,
      accent: accent || undefined,
      sourceType: sourceType || undefined,
      limit: 50,
    });
    setLoading(false);
    if (!result.ok) {
      setVoices([]);
      setTotal(0);
      setError(result.message);
      return;
    }
    setVoices(result.data.voices);
    setTotal(result.data.total);
  }, [bizStatus, business, q, language, genderPresentation, accent, sourceType]);

  useEffectTask(load, [load]);

  if (bizStatus === "loading" || (loading && business)) {
    return <LoadingState label="Loading voice library…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="The voice library is scoped to your active business."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (error && voices.length === 0) {
    return (
      <ErrorState
        title="Could not load voices"
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
            Voice Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared voices for {business.name}. Multiple agents can use the same
            voice without duplicating it.
          </p>
          {pickForAgentId ? (
            <p className="mt-2 text-sm text-info-strong">
              Pick a voice for your agent, then open the agent Voice tab to
              assign it.
            </p>
          ) : null}
        </div>
        {pickForAgentId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/agents/${pickForAgentId}/voice`}>Back to agent</Link>
          </Button>
        ) : canCreateClone ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/voices/clones">
              <Mic2 className="size-4" aria-hidden="true" />
              Custom clones
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Search</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or description"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Language</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="e.g. en"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Presentation</span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={genderPresentation}
            onChange={(e) =>
              setGenderPresentation(
                e.target.value as VoiceGenderPresentation | "",
              )
            }
          >
            <option value="">Any</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="neutral">Neutral / Any</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Accent</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder="e.g. American"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Source</span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={sourceType}
            onChange={(e) =>
              setSourceType(e.target.value as VoiceSourceType | "")
            }
          >
            <option value="">All</option>
            <option value="provider_catalog">Provider catalogue</option>
            <option value="business_clone">Custom clones</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-sm text-destructive-strong" role="alert">
          {error}
        </p>
      ) : null}

      {voices.length === 0 ? (
        <EmptyState
          icon={AudioLines}
          title="No voices match your filters"
          description={
            org?.role
              ? "Try clearing filters or check that ElevenLabs is configured on the server."
              : "Try clearing filters."
          }
          action={
            <Button variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {voices.length} of {total} eligible voices.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {voices.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                pickForAgentId={pickForAgentId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VoiceCard({
  voice,
  pickForAgentId,
}: {
  voice: VoiceSummary;
  pickForAgentId?: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">{voice.displayName}</h2>
          {voice.description ? (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {voice.description}
            </p>
          ) : null}
        </div>
        {voice.sourceType === "business_clone" ? (
          <StatusBadge status="info">Custom</StatusBadge>
        ) : null}
      </div>

      <dl className="grid gap-1 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Presentation: </span>
          {formatGenderPresentation(voice.genderPresentation)}
        </div>
        {voice.accent ? (
          <div>
            <span className="font-medium text-foreground">Accent: </span>
            {voice.accent}
          </div>
        ) : null}
        <div>
          <span className="font-medium text-foreground">Languages: </span>
          {voice.languageCodes.length
            ? voice.languageCodes.map(formatLanguage).join(", ")
            : "—"}
        </div>
        <div>
          <span className="font-medium text-foreground">Source: </span>
          {formatVoiceSourceType(voice.sourceType)}
        </div>
      </dl>

      {voice.styleLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {voice.styleLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <VoicePreviewButton
          voiceId={voice.id}
          previewAudioUrl={voice.previewAudioUrl}
          sampleText={voice.previewSampleText}
        />
        {pickForAgentId ? (
          <Button asChild size="sm">
            <Link href={`/agents/${pickForAgentId}/voice?voiceId=${voice.id}`}>
              Select for agent
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
