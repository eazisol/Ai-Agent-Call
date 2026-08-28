"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, Store } from "lucide-react";

import { CallsTable } from "@/components/calls/CallsTable";
import { useBusinessSession } from "@/components/businesses/business-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { useEffectTask } from "@/hooks/use-effect-task";
import {
  callsApi,
  formatCallApiError,
  type CallStatus,
} from "@/lib/calls-api";

const STATUS_FILTERS: Array<{ id: "all" | CallStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "started", label: "Started" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
];

export default function CallsPage() {
  const { active: business, status: bizStatus } = useBusinessSession();
  const [items, setItems] = React.useState<
    import("@/lib/calls-api").CallListItem[]
  >([]);
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (bizStatus === "loading") {
      return;
    }
    if (!business || business.status === "archived") {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await callsApi.list({
      direction: "inbound",
      status: statusFilter === "all" ? undefined : statusFilter,
    });
    setLoading(false);

    if (!result.ok) {
      setItems([]);
      setError(formatCallApiError(result.code, result.message));
      return;
    }

    setItems(result.data.items);
  }, [bizStatus, business, statusFilter]);

  useEffectTask(load, [load]);

  if (bizStatus === "loading" || (loading && business)) {
    return <LoadingState label="Loading call history…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Call history is scoped to a business. Create or switch to an active business first."
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
        title="Could not load calls"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Call history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Incoming activity for {business.name}. Status updates as Twilio and
          ElevenLabs webhooks arrive.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="sm"
            variant={statusFilter === filter.id ? "default" : "outline"}
            onClick={() => setStatusFilter(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls yet"
          description={
            statusFilter === "all"
              ? "When someone calls a business line assigned to an agent, the call appears here with status and timing."
              : `No calls with status "${statusFilter.replaceAll("_", " ")}".`
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/phone-numbers">Phone numbers</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/agents">Agents</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <CallsTable calls={items} />
      )}
    </div>
  );
}
