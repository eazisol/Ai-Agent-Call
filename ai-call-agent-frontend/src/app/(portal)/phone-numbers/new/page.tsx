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
  canPurchasePhoneNumber,
  canSearchPhoneNumbers,
  formatCapabilities,
  formatProviderError,
  phoneNumbersApi,
  type PhoneNumberSearchCandidate,
} from "@/lib/phone-numbers-api";

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "IE", label: "Ireland" },
];

export default function PurchasePhoneNumberPage() {
  const router = useRouter();
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canSearch = canSearchPhoneNumbers(org?.role);
  const canPurchase = canPurchasePhoneNumber(org?.role);

  const [step, setStep] = React.useState<"search" | "confirm" | "success">(
    "search",
  );
  const [isoCountry, setIsoCountry] = React.useState("US");
  const [areaCode, setAreaCode] = React.useState("");
  const [contains, setContains] = React.useState("");
  const [friendlyName, setFriendlyName] = React.useState("");
  const [confirmPurchase, setConfirmPurchase] = React.useState(false);
  const [candidates, setCandidates] = React.useState<
    PhoneNumberSearchCandidate[]
  >([]);
  const [selected, setSelected] =
    React.useState<PhoneNumberSearchCandidate | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [purchasing, setPurchasing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [purchasedNumber, setPurchasedNumber] = React.useState<string | null>(
    null,
  );

  if (bizStatus === "loading") {
    return <LoadingState label="Loading business…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Choose an active business before purchasing a phone number."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (!canSearch || !canPurchase) {
    return (
      <EmptyState
        icon={Phone}
        title="Permission required"
        description="Only organization owners and admins can search and purchase phone numbers."
        action={
          <Button asChild variant="outline">
            <Link href="/phone-numbers">Back to phone numbers</Link>
          </Button>
        }
      />
    );
  }

  const runSearch = async () => {
    setSearching(true);
    setError(null);
    setSelected(null);
    const result = await phoneNumbersApi.search({
      isoCountry,
      areaCode: areaCode.trim() || undefined,
      contains: contains.trim() || undefined,
      limit: 20,
    });
    setSearching(false);
    if (!result.ok) {
      setCandidates([]);
      setError(formatProviderError(result.code, result.message));
      return;
    }
    setCandidates(result.data.candidates);
    if (result.data.candidates.length === 0) {
      setError("No numbers matched your search. Try a different area code or pattern.");
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void runSearch();
  };

  const runPurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) {
      setError("Select a number from the search results.");
      return;
    }
    if (!confirmPurchase) {
      setError("Confirm that you want to purchase this number.");
      return;
    }
    setPurchasing(true);
    setError(null);
    const result = await phoneNumbersApi.purchase({
      phoneNumber: selected.phoneNumber,
      friendlyName: friendlyName.trim() || undefined,
      confirm: true,
    });
    setPurchasing(false);
    if (!result.ok) {
      setError(formatProviderError(result.code, result.message));
      return;
    }
    setPurchasedNumber(result.data.phoneNumber.phoneNumberE164);
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Number purchased
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {purchasedNumber} is now in your business inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/phone-numbers">View inventory</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/phone-numbers")}
          >
            Assign from list
          </Button>
        </div>
      </div>
    );
  }

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
            Search & purchase
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find an available number from the platform telephony provider for{" "}
            {business.name}.
          </p>
        </div>
      </div>

      {step === "search" ? (
        <form
          onSubmit={handleSearchSubmit}
          className="max-w-xl space-y-4 rounded-xl border bg-card p-6"
        >
          <FormField label="Country" htmlFor="search-country">
            <select
              id="search-country"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={isoCountry}
              disabled={searching}
              onChange={(event) => setIsoCountry(event.target.value)}
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Area code"
            htmlFor="search-area-code"
            description="Optional. Example: 415"
          >
            <Input
              id="search-area-code"
              value={areaCode}
              disabled={searching}
              onChange={(event) => setAreaCode(event.target.value)}
            />
          </FormField>

          <FormField
            label="Contains"
            htmlFor="search-contains"
            description="Optional digit pattern."
          >
            <Input
              id="search-contains"
              value={contains}
              disabled={searching}
              onChange={(event) => setContains(event.target.value)}
            />
          </FormField>

          {error && step === "search" ? (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-strong">
              <p role="alert">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={searching}
                onClick={() => void runSearch()}
              >
                Retry search
              </Button>
            </div>
          ) : null}

          <Button type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search available numbers"}
          </Button>
        </form>
      ) : null}

      {candidates.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Available numbers
          </h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Capabilities</th>
                  <th className="px-4 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.phoneNumber} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {candidate.phoneNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[candidate.locality, candidate.region]
                        .filter(Boolean)
                        .join(", ") || candidate.friendlyName || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCapabilities(candidate.capabilities)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          selected?.phoneNumber === candidate.phoneNumber
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          setSelected(candidate);
                          setStep("confirm");
                          setError(null);
                        }}
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {step === "confirm" && selected ? (
        <form
          onSubmit={(event) => void runPurchase(event)}
          className="max-w-xl space-y-4 rounded-xl border bg-card p-6"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Confirm purchase
          </h2>
          <p className="text-sm text-muted-foreground">
            You are purchasing <strong>{selected.phoneNumber}</strong> for{" "}
            {business.name}. This charges your Twilio account.
          </p>

          <FormField label="Friendly name" htmlFor="purchase-friendly-name">
            <Input
              id="purchase-friendly-name"
              value={friendlyName}
              disabled={purchasing}
              onChange={(event) => setFriendlyName(event.target.value)}
              placeholder="Main reception line"
            />
          </FormField>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={confirmPurchase}
              disabled={purchasing}
              onChange={(event) => setConfirmPurchase(event.target.checked)}
            />
            <span>I confirm I want to purchase this phone number.</span>
          </label>

          {error ? (
            <p className="text-sm text-destructive-strong" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={purchasing}
              onClick={() => {
                setStep("search");
                setError(null);
              }}
            >
              Back to search
            </Button>
            <Button type="submit" disabled={purchasing || !confirmPurchase}>
              {purchasing ? "Purchasing…" : "Purchase number"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
