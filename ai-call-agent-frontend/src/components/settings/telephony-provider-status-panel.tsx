"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { useEffectTask } from "@/hooks/use-effect-task";
import type { OrganizationRole } from "@/lib/organizations-api";
import {
  formatTelephonyStatus,
  telephonyApi,
  telephonyStatusBadge,
  type TelephonyProviderStatus,
} from "@/lib/telephony-api";

type Props = {
  role: OrganizationRole | undefined;
};

export function TelephonyProviderStatusPanel({ role }: Props) {
  const canView = role === "owner" || role === "admin";
  const [status, setStatus] = React.useState<TelephonyProviderStatus | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await telephonyApi.providerStatus();
    setLoading(false);
    if (!result.ok) {
      setStatus(null);
      setError(result.message);
      return;
    }
    setStatus(result.data.status);
  }, [canView]);

  useEffectTask(() => {
    void loadStatus();
  }, [loadStatus]);

  if (!canView) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">
          Telephony provider
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Only organization owners and admins can view server telephony
          configuration status.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border bg-card p-6"
      aria-labelledby="telephony-provider-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="telephony-provider-heading"
            className="text-sm font-semibold text-foreground"
          >
            Telephony provider (Twilio)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Server-side Twilio credentials and webhook routing. Manage business
            phone inventory from Phone numbers in the portal nav.
          </p>
        </div>
        <StatusBadge status={telephonyStatusBadge(status)}>
          {loading ? "Checking…" : formatTelephonyStatus(status)}
        </StatusBadge>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {status ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Provider
            </dt>
            <dd className="mt-1 capitalize">{status.provider}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active numbers (provider)
            </dt>
            <dd className="mt-1">{status.activePhoneNumbers}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Webhook signatures
            </dt>
            <dd className="mt-1">
              {status.webhookSignatureValidation ? "Required" : "Dev bypass"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Credentials
            </dt>
            <dd className="mt-1">
              {status.configured
                ? status.credentialsValid
                  ? "Valid"
                  : "Invalid"
                : "Missing on server"}
            </dd>
          </div>
          {status.credentialsMessage &&
          (!status.credentialsValid || !status.configured) ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Details
              </dt>
              <dd className="mt-1 text-muted-foreground">
                {status.credentialsMessage}
              </dd>
            </div>
          ) : null}
          {status.webhookUrls ? (
            <>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Incoming call webhook
                </dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {status.webhookUrls.incomingCall}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status callback webhook
                </dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {status.webhookUrls.statusCallback}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      ) : null}

      {!loading && !error && status && !status.configured ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Set <code className="text-foreground">TWILIO_ACCOUNT_SID</code> and{" "}
          <code className="text-foreground">TWILIO_AUTH_TOKEN</code> on the API
          server, then refresh.
        </p>
      ) : null}

      <div className="mt-5">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void loadStatus()}
        >
          <RefreshCw
            className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {loading ? "Refreshing…" : "Refresh status"}
        </Button>
      </div>
    </section>
  );
}
