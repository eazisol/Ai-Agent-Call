import Link from "next/link";

import { CallStatusBadge } from "@/components/calls/call-status-badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatCallDuration,
  formatFailureCode,
  type CallListItem,
} from "@/lib/calls-api";

interface CallsTableProps {
  calls: CallListItem[];
  errorMessage?: string;
}

function formatStartedAt(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString();
}

function formatDirection(direction: CallListItem["direction"]): string {
  if (direction === "outbound") {
    return "Outbound";
  }
  if (direction === "inbound") {
    return "Inbound";
  }
  return "—";
}

export function CallsTable({ calls, errorMessage }: CallsTableProps) {
  if (errorMessage) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-strong"
        role="alert"
      >
        {errorMessage}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        No calls found.
      </p>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3 md:hidden">
        {calls.map((call) => (
          <CallCard key={call.id} call={call} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Direction</th>
              <th className="px-4 py-3 font-medium">Caller</th>
              <th className="px-4 py-3 font-medium">Called number</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted-foreground">
                  {formatStartedAt(call.startedAt)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDirection(call.direction)}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {call.callerNumber ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {call.receiverNumber ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {call.agentName ?? "Unassigned"}
                </td>
                <td className="px-4 py-3">
                  <CallStatusCell call={call} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatCallDuration(call.duration)}
                </td>
                <td className="px-4 py-3">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/calls/${call.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}

function CallStatusCell({ call }: { call: CallListItem }) {
  const failureLabel = formatFailureCode(call.failureCode);

  if (call.status === "failed" && failureLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <CallStatusBadge status={call.status} />
          </span>
        </TooltipTrigger>
        <TooltipContent>{failureLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return <CallStatusBadge status={call.status} />;
}

function CallCard({ call }: { call: CallListItem }) {
  const failureLabel = formatFailureCode(call.failureCode);

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {call.callerNumber ?? "Unknown caller"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatStartedAt(call.startedAt)} · {formatDirection(call.direction)}
          </p>
        </div>
        <CallStatusBadge status={call.status} />
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Called number</dt>
          <dd>{call.receiverNumber ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Agent</dt>
          <dd>{call.agentName ?? "Unassigned"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Duration</dt>
          <dd>{formatCallDuration(call.duration)}</dd>
        </div>
        {failureLabel ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Failure</dt>
            <dd className="text-right text-destructive-strong">{failureLabel}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/calls/${call.id}`}>View details</Link>
        </Button>
      </div>
    </article>
  );
}
