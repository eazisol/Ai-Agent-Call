"use client";

import * as React from "react";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setFieldError("Email is required.");
      return;
    }
    setFieldError(undefined);
    setSubmitting(true);
    setError(null);
    const result = await authApi.forgotPassword(email.trim());
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setAccepted(true);
  };

  if (accepted) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists for that address, we sent password reset instructions."
        footer={
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          The message may take a minute to arrive. Check spam if you do not see
          it.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your email and we will send a reset link if an account exists."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
        <FormField
          label="Email"
          htmlFor="forgot-email"
          required
          error={fieldError}
        >
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldError)}
          />
        </FormField>
        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
