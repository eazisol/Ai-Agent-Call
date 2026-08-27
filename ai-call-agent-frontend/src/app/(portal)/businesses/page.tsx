"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Store } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import {
  canArchiveBusiness,
  canCreateBusiness,
  formatIndustry,
  type Business,
} from "@/lib/businesses-api";
import { formatTimezoneLabel } from "@/lib/timezones";

export default function BusinessesPage() {
  const { active: org } = useOrganizationSession();
  const { businesses, status, error, refresh } = useBusinessSession();
  const canCreate = canCreateBusiness(org?.role);
  const canArchive = canArchiveBusiness(org?.role);

  if (status === "loading") {
    return <LoadingState label="Loading businesses…" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Could not load businesses"
        description={error ?? "Please try again."}
        onRetry={() => void refresh()}
      />
    );
  }

  if (businesses.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="No businesses yet"
        description="Create a business to store hours, contact details, and later attach agents and numbers."
        action={
          canCreate ? (
            <Button asChild>
              <Link href="/businesses/new">
                <Plus className="size-4" aria-hidden="true" />
                Create business
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask an owner, admin, or manager to create the first business.
            </p>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational locations for {org?.name ?? "this workspace"}.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/businesses/new">
              <Plus className="size-4" aria-hidden="true" />
              Create business
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Timezone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((business) => (
              <BusinessRow
                key={business.id}
                business={business}
                canArchive={canArchive}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BusinessRow({
  business,
  canArchive,
}: {
  business: Business;
  canArchive: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <Link
          href={`/businesses/${business.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {business.name}
        </Link>
        <p className="text-xs text-muted-foreground">{business.email}</p>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatIndustry(business.industry, business.industryLabel)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatTimezoneLabel(business.timezone)}
      </td>
      <td className="px-4 py-3 capitalize">{business.status}</td>
      <td className="px-4 py-3 text-right">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/businesses/${business.id}`}>View</Link>
        </Button>
        {canArchive ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/businesses/${business.id}/settings`}>Settings</Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/businesses/${business.id}/hours`}>Hours</Link>
          </Button>
        )}
      </td>
    </tr>
  );
}
