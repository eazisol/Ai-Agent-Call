"use client";

import * as React from "react";

import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { agentsApi, type Agent } from "@/lib/agents-api";
import {
  formatProviderError,
  phoneNumbersApi,
  type PhoneNumber,
} from "@/lib/phone-numbers-api";

type Props = {
  phoneNumber: PhoneNumber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
};

export function PhoneNumberAssignDialog({
  phoneNumber,
  open,
  onOpenChange,
  onAssigned,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {phoneNumber && open ? (
          <AssignForm
            key={phoneNumber.id}
            phoneNumber={phoneNumber}
            onClose={() => onOpenChange(false)}
            onAssigned={onAssigned}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AssignForm({
  phoneNumber,
  onClose,
  onAssigned,
}: {
  phoneNumber: PhoneNumber;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [agentId, setAgentId] = React.useState(
    phoneNumber.assignment?.agentId ?? "",
  );
  const [loadingAgents, setLoadingAgents] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void agentsApi.list().then((result) => {
      if (cancelled) {
        return;
      }
      setLoadingAgents(false);
      if (!result.ok) {
        setAgents([]);
        setError(result.message);
        return;
      }
      setAgents(
        result.data.agents.filter(
          (agent) => agent.status === "active" || agent.status === "inactive",
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!agentId) {
      setError("Choose an agent to assign.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await phoneNumbersApi.assign(phoneNumber.id, agentId);
    setSubmitting(false);
    if (!result.ok) {
      setError(formatProviderError(result.code, result.message));
      return;
    }
    onClose();
    onAssigned();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assign agent</DialogTitle>
        <DialogDescription>
          Route {phoneNumber.phoneNumberE164} to an active business agent.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <FormField label="Agent" htmlFor="assign-agent">
          <select
            id="assign-agent"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={agentId}
            disabled={loadingAgents || submitting}
            onChange={(event) => setAgentId(event.target.value)}
          >
            <option value="">
              {loadingAgents ? "Loading agents…" : "Select an agent"}
            </option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
                {agent.status === "inactive" ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </FormField>

        {error ? (
          <p className="text-sm text-destructive-strong" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || loadingAgents}>
            {submitting ? "Assigning…" : "Assign agent"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
