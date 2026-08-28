"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Store } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { FormField } from "@/components/patterns/form-field";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canImportPhoneNumber,
  formatProviderError,
  isValidE164,
  phoneNumbersApi,
} from "@/lib/phone-numbers-api";

export default function ImportPhoneNumberPage() {
  const router = useRouter();
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canImport = canImportPhoneNumber(org?.role);

  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [friendlyName, setFriendlyName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (bizStatus === "loading") {
    return <LoadingState label="Loading business…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Choose an active business before importing a phone number."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (!canImport) {
    return (
      <EmptyState
        icon={Phone}
        title="Permission required"
        description="Only organization owners and admins can import phone numbers."
        action={
          <Button asChild variant="outline">
            <Link href="/phone-numbers">Back to phone numbers</Link>
          </Button>
        }
      />
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = phoneNumber.trim();
    if (!isValidE164(normalized)) {
      setError("Enter a valid E.164 phone number, for example +14155550100.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await phoneNumbersApi.importNumber({
      phoneNumber: normalized,
      friendlyName: friendlyName.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(formatProviderError(result.code, result.message));
      return;
    }
    router.push("/phone-numbers");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/phone-numbers">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import phone number
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Map a number that already exists in the platform Twilio account. This
            is not number porting from another carrier.
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => void submit(event)}
        className="max-w-xl space-y-4 rounded-xl border bg-card p-6"
      >
        <FormField
          label="Phone number (E.164)"
          htmlFor="import-phone-number"
          description="Example: +14155550999"
        >
          <Input
            id="import-phone-number"
            value={phoneNumber}
            disabled={submitting}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+14155550999"
          />
        </FormField>

        <FormField label="Friendly name" htmlFor="import-friendly-name">
          <Input
            id="import-friendly-name"
            value={friendlyName}
            disabled={submitting}
            onChange={(event) => setFriendlyName(event.target.value)}
            placeholder="Imported line"
          />
        </FormField>

        {error ? (
          <p className="text-sm text-destructive-strong" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Importing…" : "Import number"}
          </Button>
          <Button asChild type="button" variant="outline" disabled={submitting}>
            <Link href="/phone-numbers">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
