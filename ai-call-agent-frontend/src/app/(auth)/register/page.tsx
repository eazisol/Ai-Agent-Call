"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth-api";
import {
  rememberInviteReturn,
  resolvePostAuthPath,
} from "@/lib/invite-return";
import { withReturnTo } from "@/lib/safe-return-path";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolvePostAuthPath(searchParams.get("next"));
  const emailPrefill = searchParams.get("email")?.trim() ?? "";
  const lockEmail = searchParams.get("lockEmail") === "1" && Boolean(emailPrefill);

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState(emailPrefill);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    displayName?: string;
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (emailPrefill) {
      setEmail(emailPrefill);
    }
  }, [emailPrefill]);

  React.useEffect(() => {
    rememberInviteReturn(nextPath);
  }, [nextPath]);

  const loginHref = withReturnTo(
    emailPrefill
      ? `/login?email=${encodeURIComponent(emailPrefill)}`
      : "/login",
    nextPath,
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (!displayName.trim()) {
      nextErrors.displayName = "Display name is required.";
    }
    const emailValue = lockEmail ? emailPrefill : email.trim();
    if (!emailValue) {
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
      email: emailValue,
      password,
      ...(nextPath && nextPath !== "/dashboard" ? { returnTo: nextPath } : {}),
    });
    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "EMAIL_ALREADY_REGISTERED") {
        setError("An account already exists for this email. Sign in to continue.");
        return;
      }
      if (result.code === "EMAIL_NOT_VERIFIED") {
        const verifyParams = new URLSearchParams({
          registered: "1",
          email: emailValue,
        });
        if (nextPath && nextPath !== "/dashboard") {
          verifyParams.set("next", nextPath);
        }
        router.push(`/verify-email?${verifyParams.toString()}`);
        return;
      }
      setError(result.message);
      return;
    }

    const verifyParams = new URLSearchParams({
      registered: "1",
      email: result.data.user.email,
    });
    if (nextPath && nextPath !== "/dashboard") {
      verifyParams.set("next", nextPath);
    }
    router.push(`/verify-email?${verifyParams.toString()}`);
  };

  return (
    <AuthCard
      title="Create account"
      description={
        lockEmail
          ? "Register with your invited email to join the team."
          : "Register with your work email to get started."
      }
      footer={
        <>
          Already registered?{" "}
          <Link
            href={loginHref}
            className="font-medium text-primary hover:underline"
          >
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
          description={
            lockEmail
              ? "This email is locked to your invitation."
              : undefined
          }
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              if (!lockEmail) {
                setEmail(e.target.value);
              }
            }}
            readOnly={lockEmail}
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
            {error}{" "}
            {error.includes("Sign in") ? (
              <Link
                href={loginHref}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            ) : null}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <AuthCard title="Create account" description="Loading…">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </AuthCard>
      }
    >
      <RegisterForm />
    </React.Suspense>
  );
}
