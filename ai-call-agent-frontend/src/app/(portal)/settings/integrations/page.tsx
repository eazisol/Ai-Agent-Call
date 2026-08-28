"use client";

import Link from "next/link";
import { Plug } from "lucide-react";

import { TelephonyProviderStatusPanel } from "@/components/settings/telephony-provider-status-panel";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";

export default function IntegrationsSettingsPage() {
  const { active, status } = useOrganizationSession();

  if (status === "loading") {
    return (
      <p className="text-sm text-muted-foreground">Loading integrations…</p>
    );
  }

  if (!active) {
    return (
      <EmptyState
        icon={Plug}
        title="No active organization"
        description="Select a workspace before reviewing telephony integration status."
        action={
          <Button asChild>
            <Link href="/onboarding/organization">Create organization</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Review platform provider connectivity for {active.name}. Credentials
          stay on the server — this page never exposes secrets.
        </p>
      </div>

      <TelephonyProviderStatusPanel role={active.role} />

      <p className="text-sm text-muted-foreground">
        When Twilio is connected, manage business phone numbers from{" "}
        <Link href="/phone-numbers" className="font-medium text-foreground underline-offset-4 hover:underline">
          Phone numbers
        </Link>
        . Search, purchase, import, assign to agents, and release numbers there.
      </p>
    </div>
  );
}
