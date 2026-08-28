"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, Store } from "lucide-react";

import { CallStatusBadge } from "@/components/calls/call-status-badge";
import { useBusinessSession } from "@/components/businesses/business-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEffectTask } from "@/hooks/use-effect-task";
import {
  callsApi,
  canViewCallProviderLinks,
  formatCallApiError,
  formatCallDuration,
  formatFailureCode,
  type CallDetailResponse,
  type CallEventView,
} from "@/lib/calls-api";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  CALL_RECEIVED: "Call received",
  ROUTING_RESOLVED: "Routing resolved",
  CALL_STARTED: "Handoff started",
  CALL_CONNECTED: "Connected to agent",
  CALL_COMPLETED: "Call completed",
  CALL_FAILED: "Call failed",
  HANDOFF_FAILED: "Handoff failed",
  ROUTING_FAILED: "Routing failed",
};

function formatEventType(eventType: string): string {
  if (EVENT_LABELS[eventType]) {
    return EVENT_LABELS[eventType];
  }
  if (eventType.startsWith("conversation:")) {
    return `Conversation ${eventType.replace("conversation:", "").replaceAll("_", " ")}`;
  }
  return eventType.replaceAll("_", " ").replaceAll("-", " ");
}

function formatEventTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const callId = params.id;
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const [detail, setDetail] = React.useState<CallDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (bizStatus === "loading" || !callId) {
      return;
    }
    if (!business || business.status === "archived") {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await callsApi.get(callId);
    setLoading(false);

    if (!result.ok) {
      setDetail(null);
      setError(formatCallApiError(result.code, result.message));
      return;
    }

    setDetail(result.data);
  }, [bizStatus, business, callId]);

  useEffectTask(load, [load]);

  if (bizStatus === "loading" || (loading && business)) {
    return <LoadingState label="Loading call details…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Open call details from an active business context."
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
        title="Could not load call"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  if (!detail) {
    return null;
  }

  const { call, events } = detail;
  const failureLabel = formatFailureCode(call.failureCode);
  const showProviderLinks = canViewCallProviderLinks(org?.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Call detail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {call.callerNumber ?? "Unknown caller"} →{" "}
          {call.receiverNumber ?? "Unknown line"}
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="mt-2">
              <CallStatusBadge status={call.status} />
            </div>
            {failureLabel ? (
              <p className="mt-2 text-sm text-destructive-strong">{failureLabel}</p>
            ) : null}
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailItem
              label="Started"
              value={call.startedAt ? formatEventTime(call.startedAt) : "—"}
            />
            <DetailItem label="Ended" value={call.endedAt ? formatEventTime(call.endedAt) : "—"} />
            <DetailItem label="Duration" value={formatCallDuration(call.duration)} />
            <DetailItem label="Direction" value={call.direction ?? "inbound"} />
          </dl>
        </div>

        <dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
          <DetailItem label="Caller" value={call.callerNumber ?? "—"} />
          <DetailItem label="Called number" value={call.receiverNumber ?? "—"} />
          <DetailItem
            label="Agent"
            value={
              call.agentId && call.agentName ? (
                <Link
                  href={`/agents/${call.agentId}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {call.agentName}
                </Link>
              ) : (
                "Unassigned"
              )
            }
          />
          <DetailItem label="Business" value={business.name} />
        </dl>
      </section>

      {showProviderLinks && call.providerLinks ? (
        <Collapsible>
          <section className="rounded-xl border bg-card">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Technical references
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Twilio and ElevenLabs identifiers for troubleshooting.
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-5 py-4">
              <dl className="grid gap-3 text-sm">
                <DetailItem
                  label="Twilio Call SID"
                  value={
                    <code className="break-all font-mono text-xs">
                      {call.providerLinks.twilioCallSid}
                    </code>
                  }
                />
                <DetailItem
                  label="ElevenLabs conversation"
                  value={
                    call.providerLinks.elevenLabsConversationId ? (
                      <code className="break-all font-mono text-xs">
                        {call.providerLinks.elevenLabsConversationId}
                      </code>
                    ) : (
                      "Not linked yet"
                    )
                  }
                />
              </dl>
            </CollapsibleContent>
          </section>
        </Collapsible>
      ) : null}

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Event timeline</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Normalized lifecycle events from Twilio and ElevenLabs webhooks.
        </p>
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No lifecycle events recorded yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {events.map((event, index) => (
              <EventTimelineItem key={`${event.occurredAt}-${index}`} event={event} />
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-dashed bg-muted/20 p-5">
        <h2 className="text-sm font-semibold text-foreground">Transcript</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Transcripts and summaries will be available in a future update.
        </p>
      </section>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}

function EventTimelineItem({ event }: { event: CallEventView }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {formatEventType(event.eventType)}
          </p>
          <span
            className={cn(
              "rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground",
            )}
          >
            {event.source}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatEventTime(event.occurredAt)}
        </p>
      </div>
    </li>
  );
}
