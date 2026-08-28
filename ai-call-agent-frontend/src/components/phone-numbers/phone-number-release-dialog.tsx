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
import { Input } from "@/components/ui/input";
import {
  formatProviderError,
  phoneNumbersApi,
  type PhoneNumber,
} from "@/lib/phone-numbers-api";

type Props = {
  phoneNumber: PhoneNumber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReleased: () => void;
};

export function PhoneNumberReleaseDialog({
  phoneNumber,
  open,
  onOpenChange,
  onReleased,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {phoneNumber && open ? (
          <ReleaseForm
            key={phoneNumber.id}
            phoneNumber={phoneNumber}
            onClose={() => onOpenChange(false)}
            onReleased={onReleased}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReleaseForm({
  phoneNumber,
  onClose,
  onReleased,
}: {
  phoneNumber: PhoneNumber;
  onClose: () => void;
  onReleased: () => void;
}) {
  const [confirmText, setConfirmText] = React.useState("");
  const [unassignFirst, setUnassignFirst] = React.useState(
    Boolean(phoneNumber.assignment),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const matchesConfirm = confirmText.trim() === phoneNumber.phoneNumberE164.trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!matchesConfirm) {
      setError("Type the phone number exactly to confirm release.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await phoneNumbersApi.release(phoneNumber.id, {
      confirm: true,
      unassignFirst: phoneNumber.assignment ? unassignFirst : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(formatProviderError(result.code, result.message));
      return;
    }
    onClose();
    onReleased();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Release phone number</DialogTitle>
        <DialogDescription>
          This releases the number at the telephony provider. It will stop
          receiving calls and cannot be undone from this screen.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {phoneNumber.assignment ? (
          <label className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={unassignFirst}
              disabled={submitting}
              onChange={(event) => setUnassignFirst(event.target.checked)}
            />
            <span className="leading-snug">
              Unassign from {phoneNumber.assignment.agentName} before releasing
            </span>
          </label>
        ) : null}

        <FormField
          label={`Type ${phoneNumber.phoneNumberE164} to confirm`}
          htmlFor="release-confirm"
        >
          <Input
            id="release-confirm"
            value={confirmText}
            disabled={submitting}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={phoneNumber.phoneNumberE164}
            autoComplete="off"
          />
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
          <Button
            type="submit"
            variant="destructive"
            disabled={submitting || !matchesConfirm}
          >
            {submitting ? "Releasing…" : "Confirm release"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
