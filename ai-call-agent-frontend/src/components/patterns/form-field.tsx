import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * FormField — accessible field wrapper: label + control + help/error text.
 *
 * Use for simple forms without a form library. Wires aria-describedby
 * and exposes errors with role="alert" for screen readers.
 *
 * Portable: plain React.
 */
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accepts a node so "(optional)" markers can be styled inline. */
  label: React.ReactNode;
  /** id of the form control; links the label and descriptions. */
  htmlFor: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({
  label,
  htmlFor,
  description,
  error,
  required = false,
  children,
  className,
  ...props
}: FormFieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-1 text-destructive-strong" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive-strong">
          {error}
        </p>
      ) : description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
