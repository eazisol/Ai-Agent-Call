"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

import {
  AgentLanguageVoiceFields,
  type AgentLanguageVoiceValue,
} from "@/components/agents/agent-language-voice-fields";
import { useBusinessSession } from "@/components/businesses/business-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { FormField } from "@/components/patterns/form-field";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { agentsApi, canCreateAgent } from "@/lib/agents-api";
import { cn } from "@/lib/utils";

const STEPS = ["Identity", "Behavior", "Escalation", "Review"] as const;

export default function CreateAgentPage() {
  const router = useRouter();
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canCreate = canCreateAgent(org?.role);

  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [roleLabel, setRoleLabel] = React.useState("Receptionist");
  const [personality, setPersonality] = React.useState("");
  const [greeting, setGreeting] = React.useState(
    "Thank you for calling. How can I help you today?",
  );
  const [instructions, setInstructions] = React.useState(
    "Answer common questions politely. Collect the caller’s name and reason for calling when helpful.",
  );

  const businessLanguages = business?.languages?.length
    ? business.languages
    : [business?.defaultLanguage ?? "en"];
  const businessDefault = business?.defaultLanguage ?? "en";

  const [languageVoice, setLanguageVoice] =
    React.useState<AgentLanguageVoiceValue>({
      useBusinessLanguageSettings: true,
      languageMode:
        businessLanguages.length > 1 ? "multilingual" : "single",
      languages: [...businessLanguages],
      defaultLanguage: businessDefault,
      languageDetectionEnabled:
        businessLanguages.length > 1 &&
        business?.languageDetectionEnabled !== false,
      languageSwitchingEnabled:
        businessLanguages.length > 1 &&
        business?.languageSwitchingEnabled !== false,
      voicePreference: "neutral",
    });

  React.useEffect(() => {
    if (!business) return;
    const langs = business.languages?.length
      ? business.languages
      : [business.defaultLanguage];
    setLanguageVoice((prev) =>
      prev.useBusinessLanguageSettings
        ? {
            ...prev,
            languageMode: langs.length > 1 ? "multilingual" : "single",
            languages: [...langs],
            defaultLanguage: business.defaultLanguage,
            languageDetectionEnabled:
              langs.length > 1 && business.languageDetectionEnabled === true,
            languageSwitchingEnabled:
              langs.length > 1 && business.languageSwitchingEnabled === true,
          }
        : prev,
    );
  }, [business]);

  const [escalationEnabled, setEscalationEnabled] = React.useState(false);
  const [escalationKeywords, setEscalationKeywords] = React.useState(
    "manager, human, agent",
  );
  const [escalationPhone, setEscalationPhone] = React.useState("");
  const [escalationEmail, setEscalationEmail] = React.useState("");
  const [escalationMessage, setEscalationMessage] = React.useState("");

  if (bizStatus === "loading") {
    return <LoadingState label="Loading business…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Choose an active business before creating an agent."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (!canCreate) {
    return (
      <EmptyState
        icon={Store}
        title="Permission required"
        description="Only owners, admins, and managers can create agents."
        action={
          <Button asChild variant="outline">
            <Link href="/agents">Back to agents</Link>
          </Button>
        }
      />
    );
  }

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!name.trim()) return "Agent name is required.";
      if (!roleLabel.trim()) return "Role label is required.";
    }
    if (step === 1) {
      if (!greeting.trim()) return "Greeting is required.";
      if (!instructions.trim()) return "Instructions are required.";
      if (
        !languageVoice.useBusinessLanguageSettings &&
        languageVoice.languages.length === 0
      ) {
        return "Select at least one language.";
      }
    }
    return null;
  };

  const goNext = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const onCreate = async () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setSubmitting(true);
    setError(null);

    const keywords = escalationKeywords
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await agentsApi.create({
      name: name.trim(),
      roleLabel: roleLabel.trim(),
      personality: personality.trim() || null,
      greeting: greeting.trim(),
      instructions: instructions.trim(),
      useBusinessLanguageSettings: languageVoice.useBusinessLanguageSettings,
      languageMode: languageVoice.useBusinessLanguageSettings
        ? undefined
        : languageVoice.languageMode,
      language: languageVoice.useBusinessLanguageSettings
        ? undefined
        : languageVoice.defaultLanguage,
      languages: languageVoice.useBusinessLanguageSettings
        ? undefined
        : languageVoice.languages,
      languageDetectionEnabled: languageVoice.useBusinessLanguageSettings
        ? undefined
        : languageVoice.languageDetectionEnabled,
      languageSwitchingEnabled: languageVoice.useBusinessLanguageSettings
        ? undefined
        : languageVoice.languageSwitchingEnabled,
      voicePreference: languageVoice.voicePreference,
      escalationEnabled,
      escalationKeywords: keywords,
      escalationContactPhone: escalationPhone.trim() || null,
      escalationContactEmail: escalationEmail.trim() || null,
      escalationMessage: escalationMessage.trim() || null,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/agents/${result.data.agent.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For {business.name}. Status starts as active after create.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-md px-3 py-1.5",
              index === step
                ? "bg-muted font-medium text-foreground"
                : index < step
                  ? "text-foreground"
                  : "text-muted-foreground",
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="space-y-4 rounded-xl border bg-card p-6">
        {step === 0 ? (
          <>
            <FormField label="Agent name" htmlFor="agent-name" required>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Front Desk"
                disabled={submitting}
              />
            </FormField>
            <FormField label="Role label" htmlFor="agent-role" required>
              <Input
                id="agent-role"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="Receptionist"
                disabled={submitting}
              />
            </FormField>
            <FormField label="Personality" htmlFor="agent-personality">
              <Textarea
                id="agent-personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Warm, concise, and professional."
                rows={3}
                disabled={submitting}
              />
            </FormField>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <FormField label="Greeting" htmlFor="agent-greeting" required>
              <Textarea
                id="agent-greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </FormField>
            <FormField
              label="Instructions"
              htmlFor="agent-instructions"
              required
            >
              <Textarea
                id="agent-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={6}
                disabled={submitting}
              />
            </FormField>
            <AgentLanguageVoiceFields
              value={languageVoice}
              businessLanguages={businessLanguages}
              businessDefaultLanguage={businessDefault}
              onChange={setLanguageVoice}
              disabled={submitting}
            />
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input"
                checked={escalationEnabled}
                disabled={submitting}
                onChange={(e) => setEscalationEnabled(e.target.checked)}
              />
              <span>
                <span className="font-medium">Enable escalation settings</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Stored for later call-time use. Runtime handoff is not active
                  in M05.
                </span>
              </span>
            </label>
            <FormField
              label="Escalation keywords"
              htmlFor="agent-escalation-keywords"
            >
              <Input
                id="agent-escalation-keywords"
                value={escalationKeywords}
                onChange={(e) => setEscalationKeywords(e.target.value)}
                placeholder="manager, human"
                disabled={submitting || !escalationEnabled}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Contact phone" htmlFor="agent-escalation-phone">
                <Input
                  id="agent-escalation-phone"
                  value={escalationPhone}
                  onChange={(e) => setEscalationPhone(e.target.value)}
                  disabled={submitting || !escalationEnabled}
                />
              </FormField>
              <FormField label="Contact email" htmlFor="agent-escalation-email">
                <Input
                  id="agent-escalation-email"
                  type="email"
                  value={escalationEmail}
                  onChange={(e) => setEscalationEmail(e.target.value)}
                  disabled={submitting || !escalationEnabled}
                />
              </FormField>
            </div>
            <FormField
              label="Escalation message"
              htmlFor="agent-escalation-message"
            >
              <Textarea
                id="agent-escalation-message"
                value={escalationMessage}
                onChange={(e) => setEscalationMessage(e.target.value)}
                rows={3}
                disabled={submitting || !escalationEnabled}
              />
            </FormField>
          </div>
        ) : null}

        {step === 3 ? (
          <dl className="space-y-3 text-sm">
            <ReviewRow label="Name" value={name.trim() || "—"} />
            <ReviewRow label="Role" value={roleLabel.trim() || "—"} />
            <ReviewRow
              label="Languages"
              value={
                languageVoice.useBusinessLanguageSettings
                  ? "Use business defaults"
                  : `${languageVoice.languageMode}: ${languageVoice.languages.join(", ")}`
              }
            />
            <ReviewRow
              label="Voice preference"
              value={languageVoice.voicePreference}
            />
            <ReviewRow
              label="Escalation"
              value={escalationEnabled ? "Enabled (stub)" : "Off"}
            />
          </dl>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive-strong" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button asChild variant="outline" disabled={submitting}>
            <Link href="/agents">Cancel</Link>
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  setError(null);
                  setStep((value) => Math.max(0, value - 1));
                }}
              >
                Back
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button type="button" disabled={submitting} onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void onCreate()}
              >
                {submitting ? "Creating…" : "Create agent"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
