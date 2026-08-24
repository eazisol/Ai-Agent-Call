import * as React from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * ErrorState — consistent recoverable-error pattern.
 *
 * For page/panel level failures (not inline form validation — use
 * FormField errors for that). Always offer a recovery action.
 *
 * Portable: plain React, retry handler passed in via props.
 */
export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border bg-card px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <CircleAlert className="size-6 text-destructive-strong" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <div className="mt-5">
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export { ErrorState };
