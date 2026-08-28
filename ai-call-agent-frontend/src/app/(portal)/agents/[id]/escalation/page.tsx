"use client";

import { useEffectTask } from "@/hooks/use-effect-task";
import * as React from "react";
import { useParams } from "next/navigation";

import { AgentSubnav } from "@/components/agents/agent-subnav";
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

export default function AgentEscalationPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const canEdit = canUpdateAgent(org?.role);

  const [agent, setAgent] = React.useState<Agent | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [escalationEnabled, setEscalationEnabled] = React.useState(false);
  const [keywords, setKeywords] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");

  const hydrate = React.useCallback((row: Agent) => {
    setAgent(row);
    setEscalationEnabled(row.escalationEnabled);
    setKeywords((row.escalationKeywords ?? []).join(", "));
    setPhone(row.escalationContactPhone ?? "");
    setEmail(row.escalationContactEmail ?? "");
    setMessage(row.escalationMessage ?? "");
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

  useEffectTask(load, [load]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !agent) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const escalationKeywords = keywords
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await agentsApi.update(agent.id, {
      escalationEnabled,
      escalationKeywords,
      escalationContactPhone: phone.trim() || null,
      escalationContactEmail: email.trim() || null,
      escalationMessage: message.trim() || null,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    hydrate(result.data.agent);
    setSuccess("Escalation settings saved.");
  };

  if (loading) {
    return <LoadingState label="Loading escalation…" />;
  }

  if (!agent) {
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
      <AgentSubnav agentId={agent.id} active="escalation" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Escalation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stub settings only. Call-time escalation is not enforced until later
          modules.
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border bg-card p-6"
        onSubmit={(e) => void onSubmit(e)}
        noValidate
      >
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            checked={escalationEnabled}
            disabled={submitting || !canEdit}
            onChange={(e) => setEscalationEnabled(e.target.checked)}
          />
          <span>
            <span className="font-medium">Enable escalation settings</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Keywords and contacts are stored for future handoff behavior.
            </span>
          </span>
        </label>

        <FormField label="Keywords" htmlFor="escalation-keywords">
          <Input
            id="escalation-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="manager, human, agent"
            disabled={submitting || !canEdit || !escalationEnabled}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Contact phone" htmlFor="escalation-phone">
            <Input
              id="escalation-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting || !canEdit || !escalationEnabled}
            />
          </FormField>
          <FormField label="Contact email" htmlFor="escalation-email">
            <Input
              id="escalation-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || !canEdit || !escalationEnabled}
            />
          </FormField>
        </div>

        <FormField label="Escalation message" htmlFor="escalation-message">
          <Textarea
            id="escalation-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={submitting || !canEdit || !escalationEnabled}
          />
        </FormField>

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
            {submitting ? "Saving…" : "Save escalation"}
          </Button>
        ) : null}
      </form>
    </div>
  );
}
