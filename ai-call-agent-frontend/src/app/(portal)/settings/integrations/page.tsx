"use client";

import Link from "next/link";
import { Mic, Plug } from "lucide-react";

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

      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Mic className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">
              Voice conversations (ElevenLabs)
            </h2>
            <p className="text-sm text-muted-foreground">
              Inbound calls route from Twilio to ElevenLabs ConvAI after the
              platform resolves the called number to a business, agent, knowledge
              base, and voice. Conversation lifecycle webhooks update call status
              in the portal.
            </p>
            <p className="text-sm text-muted-foreground">
              Ensure agents are synced, knowledge is published, and voices are
              assigned before expecting successful handoffs. Review activity in{" "}
              <Link
                href="/calls"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Call history
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href="/agents">Agents</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/voices">Voices</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/knowledge">Knowledge</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        When Twilio is connected, manage business phone numbers from{" "}
        <Link
          href="/phone-numbers"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Phone numbers
        </Link>
        . Assign numbers to agents so inbound callers reach the correct AI
        receptionist.
      </p>
    </div>
  );
}
