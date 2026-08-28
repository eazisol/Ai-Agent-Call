"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, Plus, Store, Upload } from "lucide-react";
import { toast } from "sonner";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { PhoneNumberAssignDialog } from "@/components/phone-numbers/phone-number-assign-dialog";
import { PhoneNumberReleaseDialog } from "@/components/phone-numbers/phone-number-release-dialog";
import { PhoneNumberStatusBadge } from "@/components/phone-numbers/phone-number-status-badge";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { useEffectTask } from "@/hooks/use-effect-task";
import {
  canAssignPhoneNumber,
  canImportPhoneNumber,
  canPurchasePhoneNumber,
  canReleasePhoneNumber,
  formatCapabilities,
  formatProviderError,
  phoneNumbersApi,
  type PhoneNumber,
  type PhoneNumberStatus,
} from "@/lib/phone-numbers-api";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<{
  id: "all" | PhoneNumberStatus;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "provisioning", label: "Provisioning" },
  { id: "released", label: "Released" },
  { id: "failed", label: "Failed" },
];

export default function PhoneNumbersPage() {
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canPurchase = canPurchasePhoneNumber(org?.role);
  const canImport = canImportPhoneNumber(org?.role);
  const canAssign = canAssignPhoneNumber(org?.role);
  const canRelease = canReleasePhoneNumber(org?.role);

  const [items, setItems] = React.useState<PhoneNumber[]>([]);
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<PhoneNumber | null>(
    null,
  );
  const [releaseTarget, setReleaseTarget] = React.useState<PhoneNumber | null>(
    null,
  );
  const [actionBusyId, setActionBusyId] = React.useState<string | null>(null);

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
    const result = await phoneNumbersApi.list({
      status: statusFilter === "all" ? undefined : statusFilter,
    });
    setLoading(false);
    if (!result.ok) {
      setItems([]);
      setError(formatProviderError(result.code, result.message));
      return;
    }
    setItems(result.data.items);
  }, [bizStatus, business, statusFilter]);

  useEffectTask(load, [load]);

  const unassign = async (phoneNumber: PhoneNumber) => {
    setActionBusyId(phoneNumber.id);
    const result = await phoneNumbersApi.unassign(phoneNumber.id);
    setActionBusyId(null);
    if (!result.ok) {
      toast.error(formatProviderError(result.code, result.message));
      return;
    }
    toast.success("Phone number unassigned.");
    void load();
  };

  if (bizStatus === "loading" || (loading && business)) {
    return <LoadingState label="Loading phone numbers…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Phone numbers belong to a business. Create or switch to an active business first."
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
        title="Could not load phone numbers"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PhoneNumbersHeader
        businessName={business.name}
        canPurchase={canPurchase}
        canImport={canImport}
      />

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
          title="No phone numbers yet"
          description={
            statusFilter === "all"
              ? `Search and purchase a number for ${business.name}, or import one already in the platform Twilio account.`
              : `No numbers with status "${statusFilter}".`
          }
          action={
            canPurchase || canImport ? (
              <div className="flex flex-wrap justify-center gap-2">
                {canPurchase ? (
                  <Button asChild>
                    <Link href="/phone-numbers/new">
                      <Plus className="size-4" aria-hidden="true" />
                      Search & purchase
                    </Link>
                  </Button>
                ) : null}
                {canImport ? (
                  <Button asChild variant="outline">
                    <Link href="/phone-numbers/import">
                      <Upload className="size-4" aria-hidden="true" />
                      Import number
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask an owner or admin to add phone numbers.
              </p>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Capabilities</th>
                <th className="px-4 py-3 font-medium">Assigned agent</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((phoneNumber) => {
                const busy = actionBusyId === phoneNumber.id;
                const canActOnRow =
                  phoneNumber.status === "active" ||
                  phoneNumber.status === "provisioning";
                return (
                  <tr key={phoneNumber.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {phoneNumber.phoneNumberE164}
                      </div>
                      {phoneNumber.friendlyName ? (
                        <div className="text-xs text-muted-foreground">
                          {phoneNumber.friendlyName}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <PhoneNumberStatusBadge status={phoneNumber.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {phoneNumber.country}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCapabilities(phoneNumber.capabilities)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {phoneNumber.assignment?.agentName ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {phoneNumber.provider}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {canAssign && canActOnRow ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => setAssignTarget(phoneNumber)}
                          >
                            Assign
                          </Button>
                        ) : null}
                        {canAssign &&
                        canActOnRow &&
                        phoneNumber.assignment ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void unassign(phoneNumber)}
                          >
                            {busy ? "Working…" : "Unassign"}
                          </Button>
                        ) : null}
                        {canRelease && canActOnRow ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "text-destructive-strong hover:text-destructive-strong",
                            )}
                            disabled={busy}
                            onClick={() => setReleaseTarget(phoneNumber)}
                          >
                            Release
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PhoneNumberAssignDialog
        phoneNumber={assignTarget}
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
        onAssigned={() => {
          toast.success("Phone number assigned.");
          void load();
        }}
      />

      <PhoneNumberReleaseDialog
        phoneNumber={releaseTarget}
        open={Boolean(releaseTarget)}
        onOpenChange={(open) => {
          if (!open) setReleaseTarget(null);
        }}
        onReleased={() => {
          toast.success("Phone number released.");
          void load();
        }}
      />
    </div>
  );
}

function PhoneNumbersHeader({
  businessName,
  canPurchase,
  canImport,
}: {
  businessName: string;
  canPurchase: boolean;
  canImport: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Phone numbers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Business inventory for {businessName}. Assign numbers to agents for
          inbound routing in a later module.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canImport ? (
          <Button asChild variant="outline">
            <Link href="/phone-numbers/import">
              <Upload className="size-4" aria-hidden="true" />
              Import
            </Link>
          </Button>
        ) : null}
        {canPurchase ? (
          <Button asChild>
            <Link href="/phone-numbers/new">
              <Plus className="size-4" aria-hidden="true" />
              Search & purchase
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
