"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { ErrorState } from "@/components/patterns/error-state";
import { FormField } from "@/components/patterns/form-field";
import { LoadingState } from "@/components/patterns/loading-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffectTask } from "@/hooks/use-effect-task";
import {
  canArchiveKnowledge,
  canDeleteKnowledge,
  canUpdateKnowledge,
  elevenLabsKnowledgeMapping,
  formatKnowledgeType,
  formatSyncStatus,
  knowledgeApi,
  syncStatusBadge,
  type KnowledgeFaqItem,
  type KnowledgeProviderStatus,
  type KnowledgeSource,
  type KnowledgeSyncResult,
} from "@/lib/knowledge-api";

export default function KnowledgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { active: business } = useBusinessSession();

  const canUpdate = canUpdateKnowledge(org?.role);
  const canArchive = canArchiveKnowledge(org?.role);
  const canDelete = canDeleteKnowledge(org?.role);

  const [source, setSource] = React.useState<KnowledgeSource | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [faqItems, setFaqItems] = React.useState<KnowledgeFaqItem[]>([]);

  const [providerStatus, setProviderStatus] =
    React.useState<KnowledgeProviderStatus | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);

  const applySource = React.useCallback((next: KnowledgeSource) => {
    setSource(next);
    setName(next.name);
    setDescription(next.description ?? "");
    setUrl(next.url ?? "");
    setText(next.textBody ?? "");
    setFaqItems(
      next.faqItems?.length
        ? next.faqItems.map((item) => ({ ...item }))
        : [{ question: "", answer: "" }],
    );
  }, []);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setStatusLoading(true);
    setError(null);
    const result = await knowledgeApi.get(id);
    setLoading(false);
    if (!result.ok) {
      setSource(null);
      setProviderStatus(null);
      setStatusLoading(false);
      setError(result.message);
      return;
    }
    applySource(result.data.source);

    const statusResult = await knowledgeApi.providerStatus(id);
    setStatusLoading(false);
    if (!statusResult.ok) {
      setProviderStatus(null);
      return;
    }
    setProviderStatus(statusResult.data.status);
  }, [id, applySource]);

  const loadStatus = React.useCallback(async () => {
    if (!id) return;
    setStatusLoading(true);
    const result = await knowledgeApi.providerStatus(id);
    setStatusLoading(false);
    if (!result.ok) {
      setProviderStatus(null);
      return;
    }
    setProviderStatus(result.data.status);
  }, [id]);

  useEffectTask(load, [load]);

  const mapping = elevenLabsKnowledgeMapping(source);
  const syncStatus =
    providerStatus?.syncStatus ?? mapping?.syncStatus ?? "not_provisioned";
  const lastError = providerStatus?.lastError ?? mapping?.lastError ?? null;
  const lastSyncedAt =
    providerStatus?.lastSyncedAt ?? mapping?.lastSyncedAt ?? null;
  const externalId =
    providerStatus?.externalSourceId ?? mapping?.externalSourceId ?? null;

  const onSave = async () => {
    if (!source || !canUpdate || source.status === "archived") return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);

    const input: Parameters<typeof knowledgeApi.update>[1] = {
      name: name.trim(),
      description: description.trim() || null,
    };
    if (source.type === "url") {
      input.url = url.trim();
    }
    if (source.type === "text") {
      input.text = text.trim();
    }
    if (source.type === "faq") {
      const items = faqItems
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))
        .filter((item) => item.question && item.answer);
      if (items.length === 0) {
        setBusy(false);
        setError("Add at least one FAQ question and answer.");
        return;
      }
      input.items = items;
    }

    const result = await knowledgeApi.update(source.id, input);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    applySource(result.data.source);
    setMessage("Knowledge updated.");
    void loadStatus();
  };

  const onArchive = async () => {
    if (!source || !canArchive) return;
    if (
      !window.confirm(
        `Archive “${source.name}”? Archived sources stay in the library but are hidden by default.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await knowledgeApi.archive(source.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    applySource(result.data.source);
    setMessage("Knowledge archived.");
  };

  const onDelete = async () => {
    if (!source || !canDelete) return;
    const assigned = source.assignedAgentCount > 0;
    const confirmMessage = assigned
      ? `“${source.name}” is assigned to ${source.assignedAgentCount} agent(s). Delete will fail until you unassign it from every agent. Continue anyway?`
      : `Permanently delete “${source.name}”? This cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setBusy(true);
    setError(null);
    const result = await knowledgeApi.remove(source.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push("/knowledge");
  };

  const runSync = async (mode: "sync" | "resync") => {
    if (!source || !canUpdate || source.status === "archived") return;
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    setWarnings([]);
    const result =
      mode === "resync"
        ? await knowledgeApi.resync(source.id)
        : await knowledgeApi.sync(source.id);
    setSyncing(false);
    if (!result.ok) {
      setSyncError(result.message);
      void loadStatus();
      return;
    }
    applySource(result.data.knowledge);
    const sync: KnowledgeSyncResult = result.data.sync;
    setProviderStatus({
      provider: sync.provider,
      syncStatus: sync.syncStatus,
      externalSourceId: sync.externalSourceId,
      lastSyncedAt: sync.lastSyncedAt,
      lastSyncedVersion: sync.lastSyncedVersion,
      lastError: sync.lastError,
      remote: {
        checked: false,
        exists: null,
        name: null,
        rawStatus: null,
      },
    });
    setWarnings(sync.warnings ?? []);
    setSyncSuccess(
      sync.syncStatus === "synced"
        ? "Provider synced successfully."
        : "Sync finished.",
    );
    void loadStatus();
  };

  if (loading) {
    return <LoadingState label="Loading knowledge…" />;
  }

  if (!source) {
    return (
      <ErrorState
        title="Knowledge not found"
        description={error ?? "Unavailable."}
        onRetry={() => void load()}
      />
    );
  }

  const ctaLabel =
    syncStatus === "error"
      ? "Retry sync"
      : syncStatus === "synced"
        ? "Re-sync"
        : "Sync to ElevenLabs";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {source.name}
            </h1>
            <StatusBadge
              status={source.status === "active" ? "success" : "neutral"}
            >
              {source.status === "active" ? "Active" : "Archived"}
            </StatusBadge>
            {source.needsSync ? (
              <StatusBadge status="warning">Needs sync</StatusBadge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatKnowledgeType(source.type)}
            {business ? ` · ${business.name}` : null}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/knowledge">Back to library</Link>
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

      <section
        className="rounded-xl border bg-card p-6"
        aria-labelledby="knowledge-sync-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="knowledge-sync-heading"
              className="text-sm font-semibold text-foreground"
            >
              Provider sync
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish this source to ElevenLabs so assigned agents can use it.
            </p>
          </div>
          <StatusBadge status={syncStatusBadge(syncStatus)}>
            {statusLoading && !syncing
              ? "Checking…"
              : formatSyncStatus(syncStatus)}
          </StatusBadge>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last synced
            </dt>
            <dd className="mt-1">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Version
            </dt>
            <dd className="mt-1">{source.version}</dd>
          </div>
          {externalId ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Provider source ID
              </dt>
              <dd className="mt-1 break-all font-mono text-xs">{externalId}</dd>
            </div>
          ) : null}
        </dl>

        {lastError && syncStatus === "error" ? (
          <div
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
            role="alert"
          >
            {lastError}
          </div>
        ) : null}
        {syncError ? (
          <p className="mt-4 text-sm text-destructive-strong" role="alert">
            {syncError}
          </p>
        ) : null}
        {syncSuccess ? (
          <p className="mt-4 text-sm text-success-strong" role="status">
            {syncSuccess}
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
          {canUpdate && source.status !== "archived" ? (
            <>
              <Button
                type="button"
                disabled={syncing}
                onClick={() =>
                  void runSync(syncStatus === "synced" ? "resync" : "sync")
                }
              >
                <RefreshCw
                  className={`mr-1.5 size-3.5 ${syncing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {syncing ? "Syncing…" : ctaLabel}
              </Button>
              {syncStatus === "synced" || syncStatus === "error" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={syncing}
                  onClick={() => void runSync("resync")}
                >
                  Force re-sync
                </Button>
              ) : null}
            </>
          ) : null}
          {!canUpdate ? (
            <p className="text-sm text-muted-foreground">
              You can view sync status. Ask an owner, admin, or manager to sync.
            </p>
          ) : null}
          {canUpdate && source.status === "archived" ? (
            <p className="text-sm text-muted-foreground">
              Archived sources cannot be synced.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Details</h2>
        <FormField label="Name" htmlFor="edit-knowledge-name" required>
          <Input
            id="edit-knowledge-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canUpdate || busy || source.status === "archived"}
          />
        </FormField>
        <FormField label="Description" htmlFor="edit-knowledge-description">
          <Textarea
            id="edit-knowledge-description"
            value={description}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canUpdate || busy || source.status === "archived"}
          />
        </FormField>

        {source.type === "url" ? (
          <FormField label="URL" htmlFor="edit-knowledge-url" required>
            <Input
              id="edit-knowledge-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={!canUpdate || busy || source.status === "archived"}
            />
          </FormField>
        ) : null}

        {source.type === "text" ? (
          <FormField label="Text" htmlFor="edit-knowledge-text" required>
            <Textarea
              id="edit-knowledge-text"
              value={text}
              rows={10}
              onChange={(e) => setText(e.target.value)}
              disabled={!canUpdate || busy || source.status === "archived"}
            />
          </FormField>
        ) : null}

        {source.type === "faq" ? (
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="space-y-3 rounded-lg border border-border/70 p-4"
              >
                <FormField label="Question" htmlFor={`edit-faq-q-${index}`}>
                  <Input
                    id={`edit-faq-q-${index}`}
                    value={item.question}
                    disabled={!canUpdate || busy || source.status === "archived"}
                    onChange={(e) =>
                      setFaqItems((rows) =>
                        rows.map((row, i) =>
                          i === index
                            ? { ...row, question: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </FormField>
                <FormField label="Answer" htmlFor={`edit-faq-a-${index}`}>
                  <Textarea
                    id={`edit-faq-a-${index}`}
                    value={item.answer}
                    rows={3}
                    disabled={!canUpdate || busy || source.status === "archived"}
                    onChange={(e) =>
                      setFaqItems((rows) =>
                        rows.map((row, i) =>
                          i === index
                            ? { ...row, answer: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </FormField>
              </div>
            ))}
            {canUpdate && source.status !== "archived" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  setFaqItems((rows) => [
                    ...rows,
                    { question: "", answer: "" },
                  ])
                }
              >
                Add FAQ item
              </Button>
            ) : null}
          </div>
        ) : null}

        {source.type === "file" ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail
              label="Filename"
              value={source.originalFilename ?? "—"}
            />
            <Detail label="Content type" value={source.contentType ?? "—"} />
            <Detail
              label="Size"
              value={
                source.byteSize != null
                  ? `${Math.round(source.byteSize / 1024)} KB`
                  : "—"
              }
            />
          </dl>
        ) : null}

        {canUpdate && source.status !== "archived" ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void onSave()}
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        ) : null}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">
          Assigned agents
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {source.assignedAgentCount === 0
            ? "Not assigned to any agents yet."
            : `Used by ${source.assignedAgentCount} agent(s).`}
        </p>
        {(source.assignedAgents ?? []).length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {source.assignedAgents.map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/agents/${agent.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {agent.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {canArchive && source.status !== "archived" ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void onArchive()}
          >
            Archive
          </Button>
        ) : null}
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
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
