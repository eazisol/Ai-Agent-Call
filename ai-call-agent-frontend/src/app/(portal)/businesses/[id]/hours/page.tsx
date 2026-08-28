"use client";

import { useEffectTask } from "@/hooks/use-effect-task";
import * as React from "react";
import { useParams } from "next/navigation";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { BusinessSubnav } from "@/components/businesses/business-subnav";
import {
  BusinessHoursEditor,
  closedWeek,
} from "@/components/businesses/business-hours-editor";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import {
  businessesApi,
  canUpdateBusiness,
  type Business,
  type BusinessHour,
} from "@/lib/businesses-api";
import { formatTimezoneLabel } from "@/lib/timezones";

export default function BusinessHoursPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { refresh: refreshSession } = useBusinessSession();
  const canEdit = canUpdateBusiness(org?.role);

  const [business, setBusiness] = React.useState<Business | null>(null);
  const [hours, setHours] = React.useState<BusinessHour[]>(closedWeek());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

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
    setHours(
      result.data.business.hours.length
        ? result.data.business.hours
        : closedWeek(),
    );
  }, [id]);

  useEffectTask(load, [load]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !business) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const result = await businessesApi.update(business.id, { hours });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBusiness(result.data.business);
    setHours(result.data.business.hours);
    setSuccess("Business hours saved.");
    await refreshSession();
  };

  if (loading) {
    return <LoadingState label="Loading hours…" />;
  }

  if (!business) {
    return (
      <ErrorState
        title="Business not found"
        description={error ?? "Unavailable."}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <BusinessSubnav businessId={business.id} active="hours" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business hours</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly schedule in {formatTimezoneLabel(business.timezone)}. One open
          interval per day.
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border bg-card p-6"
        onSubmit={(e) => void onSubmit(e)}
      >
        <BusinessHoursEditor
          hours={hours}
          onChange={setHours}
          disabled={submitting || !canEdit}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-sm text-success-strong">
            {success}
          </p>
        ) : null}
        {canEdit ? (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save hours"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            View-only for your role.
          </p>
        )}
      </form>
    </div>
  );
}
