"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import {
  AgentLanguageVoiceFields,
  type AgentLanguageVoiceValue,
} from "@/components/agents/agent-language-voice-fields";
import { AgentSubnav } from "@/components/agents/agent-subnav";
import { useBusinessSession } from "@/components/businesses/business-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { ErrorState } from "@/components/patterns/error-state";
import { FormField } from "@/components/patterns/form-field";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  agentsApi,
  canUpdateAgent,
  type Agent,
} from "@/lib/agents-api";

export default function AgentBehaviorPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { active: business } = useBusinessSession();
  const canEdit = canUpdateAgent(org?.role);

  const [agent, setAgent] = React.useState<Agent | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [name, setName] = React.useState("");
  const [roleLabel, setRoleLabel] = React.useState("");
  const [personality, setPersonality] = React.useState("");
  const [greeting, setGreeting] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [languageVoice, setLanguageVoice] =
    React.useState<AgentLanguageVoiceValue | null>(null);

  const businessLanguages = business?.languages?.length
    ? business.languages
    : [business?.defaultLanguage ?? "en"];
  const businessDefault = business?.defaultLanguage ?? "en";

  const hydrate = React.useCallback((row: Agent) => {
    setAgent(row);
    setName(row.name);
    setRoleLabel(row.roleLabel);
    setPersonality(row.personality ?? "");
    setGreeting(row.greeting);
    setInstructions(row.instructions);
    setLanguageVoice({
      useBusinessLanguageSettings: row.useBusinessLanguageSettings,
      languageMode: row.languageMode,
      languages: row.languages?.length ? row.languages : [row.language],
      defaultLanguage: row.language,
      languageDetectionEnabled: row.languageDetectionEnabled,
      languageSwitchingEnabled: row.languageSwitchingEnabled,
      voicePreference: row.voicePreference ?? "neutral",
    });
  }, []);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const result = await agentsApi.get(id);
    setLoading(false);
    if (!result.ok) {
      setAgent(null);
      setError(result.message);
      return;
    }
    hydrate(result.data.agent);
  }, [hydrate, id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !agent || !languageVoice) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await agentsApi.update(agent.id, {
      name: name.trim(),
      roleLabel: roleLabel.trim(),
      personality: personality.trim() || null,
      greeting: greeting.trim(),
      instructions: instructions.trim(),
      useBusinessLanguageSettings: languageVoice.useBusinessLanguageSettings,
      languageMode: languageVoice.languageMode,
      language: languageVoice.defaultLanguage,
      languages: languageVoice.languages,
      languageDetectionEnabled: languageVoice.languageDetectionEnabled,
      languageSwitchingEnabled: languageVoice.languageSwitchingEnabled,
      voicePreference: languageVoice.voicePreference,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    hydrate(result.data.agent);
    setSuccess("Behavior settings saved.");
  };

  if (loading) {
    return <LoadingState label="Loading behavior…" />;
  }

  if (!agent || !languageVoice) {
    return (
      <ErrorState
        title="Agent not found"
        description={error ?? "Unavailable."}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <AgentSubnav agentId={agent.id} active="behavior" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Behavior</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canEdit
            ? "Update role, greeting, instructions, language, and voice preference."
            : "View only. Editing requires owner, admin, or manager."}
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border bg-card p-6"
        onSubmit={(e) => void onSubmit(e)}
        noValidate
      >
        <FormField label="Agent name" htmlFor="behavior-name" required>
          <Input
            id="behavior-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting || !canEdit}
          />
        </FormField>
        <FormField label="Role label" htmlFor="behavior-role" required>
          <Input
            id="behavior-role"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
            disabled={submitting || !canEdit}
          />
        </FormField>
        <FormField label="Personality" htmlFor="behavior-personality">
          <Textarea
            id="behavior-personality"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={3}
            disabled={submitting || !canEdit}
          />
        </FormField>
        <FormField label="Greeting" htmlFor="behavior-greeting" required>
          <Textarea
            id="behavior-greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            rows={3}
            disabled={submitting || !canEdit}
          />
        </FormField>
        <FormField
          label="Instructions"
          htmlFor="behavior-instructions"
          required
        >
          <Textarea
            id="behavior-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={8}
            disabled={submitting || !canEdit}
          />
        </FormField>

        <AgentLanguageVoiceFields
          value={languageVoice}
          businessLanguages={businessLanguages}
          businessDefaultLanguage={businessDefault}
          onChange={setLanguageVoice}
          disabled={submitting || !canEdit}
        />

        {error ? (
          <p className="text-sm text-destructive-strong" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-success-strong" role="status">
            {success}
          </p>
        ) : null}

        {canEdit ? (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save behavior"}
          </Button>
        ) : null}
      </form>
    </div>
  );
}
