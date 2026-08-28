"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { useAuthSession } from "@/components/auth/auth-session";
import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth-api";
import {
  rememberInviteReturn,
  resolvePostAuthPath,
} from "@/lib/invite-return";
import { withReturnTo } from "@/lib/safe-return-path";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthSession();
  const nextPath = resolvePostAuthPath(searchParams.get("next"));
  const emailPrefill = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = React.useState(emailPrefill);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);

  const registerHref = withReturnTo(
    emailPrefill
      ? `/register?email=${encodeURIComponent(emailPrefill)}&lockEmail=1`
      : "/register",
    nextPath,
  );

  React.useEffect(() => {
    rememberInviteReturn(nextPath);
  }, [nextPath]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!password) {
      nextErrors.password = "Password is required.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await authApi.login({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "EMAIL_NOT_VERIFIED") {
        setError(
          "Verify your email to continue. We sent a new verification link.",
        );
        return;
      }
      setError(result.message);
      return;
    }

    setUser(result.data.user);
    router.replace(nextPath);
  };

  return (
    <AuthCard
      title="Sign in"
      description="Access your EaziAICall workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href={registerHref}
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
        <FormField
          label="Email"
          htmlFor="login-email"
          required
          error={fieldErrors.email}
        >
          <Input
            id="login-email"
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
          htmlFor="login-password"
          required
          error={fieldErrors.password}
        >
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.password)}
          />
        </FormField>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <AuthCard title="Sign in" description="Access your EaziAICall workspace.">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </AuthCard>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
