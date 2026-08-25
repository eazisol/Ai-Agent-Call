"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth-api";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    displayName?: string;
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (!displayName.trim()) {
      nextErrors.displayName = "Display name is required.";
    }
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await authApi.register({
      displayName: displayName.trim(),
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(
      `/verify-email?registered=1&email=${encodeURIComponent(result.data.user.email)}`,
    );
  };

  return (
    <AuthCard
      title="Create account"
      description="Register with your work email to get started."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
        <FormField
          label="Display name"
          htmlFor="register-name"
          required
          error={fieldErrors.displayName}
        >
          <Input
            id="register-name"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.displayName)}
          />
        </FormField>
        <FormField
          label="Email"
          htmlFor="register-email"
          required
          error={fieldErrors.email}
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.email)}
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="register-password"
          required
          description="At least 8 characters."
          error={fieldErrors.password}
        >
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.password)}
          />
        </FormField>
        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
