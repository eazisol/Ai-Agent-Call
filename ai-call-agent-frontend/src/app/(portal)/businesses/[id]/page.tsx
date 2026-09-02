"use client";

import { useEffectTask } from "@/hooks/use-effect-task";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { BusinessSubnav } from "@/components/businesses/business-subnav";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import {
  businessesApi,
  DAY_LABELS,
  formatIndustry,
  formatLanguages,
  type Business,
} from "@/lib/businesses-api";
import { formatTimezoneLabel } from "@/lib/timezones";

export default function BusinessDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await businessesApi.get(id);
    setLoading(false);
    if (!result.ok) {
      setBusiness(null);
      setError(result.message);
      return;
    }
    setBusiness(result.data.business);
  }, [id]);

  useEffectTask(load, [load]);

  if (loading) {
    return <LoadingState label="Loading business…" />;
  }

  if (error) {
    const isTimeout = /timed out/i.test(error);
    const isAuth =
      error.toLowerCase().includes("authentication") ||
      error.toLowerCase().includes("sign in");
    const title = isTimeout
      ? "Request timed out"
      : isAuth
        ? "Session expired"
        : "Could not load business";
    return (
      <ErrorState
        title={title}
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  if (!business) {
    return (
      <ErrorState
        title="Business not found"
        description="This business is unavailable in the active workspace."
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <BusinessSubnav businessId={business.id} active="overview" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {formatIndustry(business.industry, business.industryLabel)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            Status: {business.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/businesses/${business.id}/settings`}>Settings</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/businesses/${business.id}/hours`}>Hours</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <Detail label="Email" value={business.email} />
        <Detail label="Phone" value={business.phone ?? "—"} />
        <Detail label="Website" value={business.website ?? "—"} />
        <Detail label="Timezone" value={formatTimezoneLabel(business.timezone)} />
        <Detail
          label="Languages"
          value={formatLanguages(
            business.languages ?? [business.defaultLanguage],
            business.defaultLanguage,
          )}
        />
        <Detail
          label="Language detection"
          value={
            business.languageDetectionEnabled
              ? business.languageSwitchingEnabled
                ? "Auto-detect + mid-call switch"
                : "Auto-detect only"
              : "Default / fallback only"
          }
        />
        <Detail
          label="Location"
          value={[business.settings.city, business.settings.country]
            .filter(Boolean)
            .join(", ") || "—"}
        />
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-3 text-sm font-medium">This week</h2>
        <ul className="space-y-2 text-sm">
          {business.hours.map((hour) => (
            <li
              key={hour.dayOfWeek}
              className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0"
            >
              <span className="text-muted-foreground">
                {DAY_LABELS[hour.dayOfWeek]}
              </span>
              <span>
                {hour.isClosed
                  ? "Closed"
                  : `${hour.opensAt ?? "—"} – ${hour.closesAt ?? "—"}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all text-sm font-medium">{value}</p>
    </div>
  );
}
