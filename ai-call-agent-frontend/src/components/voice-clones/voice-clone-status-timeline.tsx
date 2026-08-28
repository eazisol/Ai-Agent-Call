"use client";

import { cn } from "@/lib/utils";
import {
  formatVoiceCloneStatus,
  type VoiceCloneStatus,
} from "@/lib/voice-clones-api";

const STEPS: VoiceCloneStatus[] = [
  "draft",
  "processing",
  "ready",
];

type Props = {
  status: VoiceCloneStatus;
  className?: string;
};

function stepIndex(status: VoiceCloneStatus): number {
  if (status === "failed") return 1;
  if (status === "revoked") return 2;
  if (status === "ready") return 2;
  if (status === "processing") return 1;
  return 0;
}

export function VoiceCloneStatusTimeline({ status, className }: Props) {
  const active = stepIndex(status);
  const terminal =
    status === "failed"
      ? "failed"
      : status === "revoked"
        ? "revoked"
        : null;

  return (
    <ol
      className={cn("flex flex-wrap items-center gap-2 text-sm", className)}
      aria-label="Clone lifecycle"
    >
      {STEPS.map((step, index) => {
        const done = index < active;
        const current = index === active && !terminal;
        const label =
          step === "ready" && status === "revoked"
            ? "Revoked"
            : formatVoiceCloneStatus(step);

        return (
          <li key={step} className="flex items-center gap-2">
            {index > 0 ? (
              <span
                className={cn(
                  "hidden h-px w-6 sm:block",
                  done ? "bg-success" : "bg-border",
                )}
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                done && "border-success/30 bg-success/10 text-success-strong",
                current && "border-info/30 bg-info/10 text-info-strong",
                !done &&
                  !current &&
                  "border-border bg-muted text-muted-foreground",
                terminal === "failed" &&
                  step === "processing" &&
                  "border-destructive/30 bg-destructive/10 text-destructive-strong",
                terminal === "revoked" &&
                  step === "ready" &&
                  "border-warning/40 bg-warning/15 text-warning-strong",
              )}
            >
              {terminal === "failed" && step === "processing"
                ? "Failed"
                : label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
