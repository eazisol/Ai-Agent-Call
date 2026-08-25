"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth-api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (!token) {
    return (
      <AuthCard
        title="Invalid reset link"
        description="This password reset link is missing a token."
        footer={
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Open the link from your email, or request a new password reset.
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        description="You can sign in with your new password."
        footer={
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        }
      >
        <Button className="w-full" onClick={() => router.push("/login")}>
          Continue to sign in
        </Button>
      </AuthCard>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (password !== confirm) {
      nextErrors.confirm = "Passwords do not match.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await authApi.resetPassword(token, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDone(true);
  };

  return (
    <AuthCard
      title="Reset password"
      description="Choose a new password for your account."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
        <FormField
          label="New password"
          htmlFor="reset-password"
          required
          description="At least 8 characters."
          error={fieldErrors.password}
        >
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.password)}
          />
        </FormField>
        <FormField
          label="Confirm password"
          htmlFor="reset-confirm"
          required
          error={fieldErrors.confirm}
        >
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.confirm)}
          />
        </FormField>
        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <AuthCard title="Reset password" description="Choose a new password.">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </AuthCard>
      }
    >
      <ResetPasswordForm />
    </React.Suspense>
  );
}
