"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { useBusinessSession } from "@/components/businesses/business-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { VoiceCloneStatusTimeline } from "@/components/voice-clones/voice-clone-status-timeline";
import { VoicePreviewButton } from "@/components/voices/voice-preview-button";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffectTask } from "@/hooks/use-effect-task";
import { voicesApi } from "@/lib/voices-api";
import {
  canDeleteVoiceClone,
  canManageVoiceCloneSamples,
  canRevokeVoiceClone,
  formatSampleBytes,
  formatVoiceCloneStatus,
  voiceCloneStatusBadge,
  voiceClonesApi,
  type VoiceCloneDetail,
} from "@/lib/voice-clones-api";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function VoiceCloneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { active: business } = useBusinessSession();

  const canRevoke = canRevokeVoiceClone(org?.role);
  const canDelete = canDeleteVoiceClone(org?.role);

  const [clone, setClone] = React.useState<VoiceCloneDetail | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = React.useState<string | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedRef = React.useRef<number | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const result = await voiceClonesApi.get(id);
    setLoading(false);
    if (!result.ok) {
      setClone(null);
      setPreviewAudioUrl(null);
      setError(result.message);
      return;
    }
    setClone(result.data.clone);

    if (result.data.clone.voiceAssetId) {
      const voiceResult = await voicesApi.get(result.data.clone.voiceAssetId);
      if (voiceResult.ok) {
        setPreviewAudioUrl(voiceResult.data.voice.previewAudioUrl);
      } else {
        setPreviewAudioUrl(null);
      }
    } else {
      setPreviewAudioUrl(null);
    }
  }, [id]);

  const refreshStatus = React.useCallback(async () => {
    if (!id) return;
    const result = await voiceClonesApi.status(id);
    if (!result.ok) return;
    setClone((prev) =>
      prev
        ? {
            ...prev,
            status: result.data.status,
            lastError: result.data.lastError,
            voiceAssetId: result.data.voiceAssetId,
          }
        : prev,
    );
    if (
      result.data.status === "ready" ||
      result.data.status === "failed" ||
      result.data.status === "revoked"
    ) {
      void load();
    }
  }, [id, load]);

  useEffectTask(load, [load]);

  const cloneStatus = clone?.status;
  const cloneId = clone?.id;

  React.useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollStartedRef.current = null;

    if (!cloneId || cloneStatus !== "processing") {
      return;
    }

    pollStartedRef.current = Date.now();
    pollRef.current = setInterval(() => {
      if (
        pollStartedRef.current &&
        Date.now() - pollStartedRef.current > 120_000
      ) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      void refreshStatus();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [cloneStatus, cloneId, refreshStatus]);

  const onRetry = async () => {
    if (!clone) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    const result = await voiceClonesApi.retry(clone.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setClone(result.data.clone);
    setMessage("Clone resubmitted for processing.");
  };

  const onRevoke = async () => {
    if (!clone || !canRevoke) return;
    setBusy(true);
    setError(null);
    const result = await voiceClonesApi.revoke(clone.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRevokeOpen(false);
    setClone(result.data.clone);
    setMessage("Clone revoked.");
  };

  const onDelete = async () => {
    if (!clone || !canDelete) return;
    setBusy(true);
    setError(null);
    const result = await voiceClonesApi.remove(clone.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setDeleteOpen(false);
      return;
    }
    router.push("/voices/clones");
  };

  if (loading) {
    return <LoadingState label="Loading custom voice…" />;
  }

  if (error || !clone) {
    return (
      <ErrorState
        title="Could not load custom voice"
        description={error ?? "Clone not found."}
        onRetry={() => void load()}
      />
    );
  }

  const showDelete =
    canDelete &&
    (clone.status === "draft" ||
      clone.status === "failed" ||
      clone.status === "revoked");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {clone.displayName}
            </h1>
            <StatusBadge status={voiceCloneStatusBadge(clone.status)}>
              {formatVoiceCloneStatus(clone.status)}
            </StatusBadge>
          </div>
          {clone.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {clone.description}
            </p>
          ) : null}
          {business ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Business: {business.name}
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/voices/clones">All clones</Link>
        </Button>
      </div>

      <VoiceCloneStatusTimeline status={clone.status} />

      {clone.status === "processing" ? (
        <p className="inline-flex items-center gap-2 text-sm text-info-strong">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Processing with voice provider… Status refreshes every few seconds.
        </p>
      ) : null}

      {clone.status === "failed" && clone.lastError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive-strong">Clone failed</p>
          <p className="mt-1 text-muted-foreground">{clone.lastError}</p>
          {canManageVoiceCloneSamples(org?.role) ? (
            <Button
              type="button"
              className="mt-3"
              size="sm"
              disabled={busy}
              onClick={() => void onRetry()}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

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

      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold">Details</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDate(clone.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd>{formatDate(clone.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ready</dt>
            <dd>{formatDate(clone.readyAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Consent</dt>
            <dd>
              {clone.consentRecorded
                ? `Recorded ${formatDate(clone.consentAcceptedAt)}`
                : "Not recorded"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Samples</dt>
            <dd>{clone.sampleCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Agents using</dt>
            <dd>{clone.assignedAgentCount}</dd>
          </div>
        </dl>
      </section>

      {clone.samples.length > 0 ? (
        <section className="space-y-3 rounded-xl border bg-card p-6">
          <h2 className="text-sm font-semibold">Uploaded samples</h2>
          <ul className="space-y-2 text-sm">
            {clone.samples.map((sample) => (
              <li
                key={sample.id}
                className="flex justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span className="truncate">{sample.originalFilename}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatSampleBytes(sample.byteSize)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {clone.status === "ready" && clone.voiceAssetId ? (
        <section className="space-y-3 rounded-xl border bg-card p-6">
          <h2 className="text-sm font-semibold">Voice library</h2>
          <p className="text-sm text-muted-foreground">
            This clone is available in your shared voice library. Assign it to
            agents from the library or each agent&apos;s Voice tab.
          </p>
          <div className="flex flex-wrap gap-2">
            <VoicePreviewButton
              voiceId={clone.voiceAssetId}
              previewAudioUrl={previewAudioUrl}
            />
            <Button asChild variant="outline" size="sm">
              <Link href="/voices">Open Voice Library</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {clone.assignedAgents.length > 0 ? (
        <section className="space-y-3 rounded-xl border bg-card p-6">
          <h2 className="text-sm font-semibold">Assigned agents</h2>
          <ul className="space-y-2 text-sm">
            {clone.assignedAgents.map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/agents/${agent.id}/voice`}
                  className="text-info-strong hover:underline"
                >
                  {agent.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {clone.status === "draft" ? (
          <Button asChild>
            <Link href={`/voices/clones/new?resume=${clone.id}`}>
              Continue setup
            </Link>
          </Button>
        ) : null}
        {canRevoke && clone.status === "ready" ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setRevokeOpen(true)}
          >
            Revoke clone
          </Button>
        ) : null}
        {showDelete ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        ) : null}
      </div>

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke custom voice?</DialogTitle>
            <DialogDescription>
              {clone.assignedAgentCount > 0
                ? `“${clone.displayName}” is assigned to ${clone.assignedAgentCount} agent(s). Revoking removes it from the assign picker; you may need to change those agents' voices afterward.`
                : `“${clone.displayName}” will be removed from the voice library and marked revoked.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setRevokeOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void onRevoke()}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete custom voice?</DialogTitle>
            <DialogDescription>
              {clone.assignedAgentCount > 0
                ? `“${clone.displayName}” is still assigned to ${clone.assignedAgentCount} agent(s). Deletion will fail until every agent is unassigned.`
                : `Permanently delete “${clone.displayName}” and its private samples? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void onDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
