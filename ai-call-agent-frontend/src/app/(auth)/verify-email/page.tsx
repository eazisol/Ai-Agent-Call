"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { Spinner } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/auth-api";
import {
  rememberInviteReturn,
  resolvePostAuthPath,
} from "@/lib/invite-return";
import { withReturnTo } from "@/lib/safe-return-path";

type VerifyState =
  | { kind: "pending-check" }
  | { kind: "awaiting-email"; email?: string }
  | { kind: "success"; email: string }
  | { kind: "error"; message: string };

function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const registered = searchParams.get("registered") === "1";
  const emailHint = searchParams.get("email")?.trim() || undefined;
  const nextPath = resolvePostAuthPath(searchParams.get("next"));

  const [state, setState] = React.useState<VerifyState>(() => {
    if (token) {
      return { kind: "pending-check" };
    }
    if (registered) {
      return { kind: "awaiting-email", email: emailHint };
    }
    return {
      kind: "error",
      message: "This verification link is missing a token.",
    };
  });

  React.useEffect(() => {
    rememberInviteReturn(nextPath);
  }, [nextPath]);

  React.useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await authApi.verifyEmail(token);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setState({ kind: "error", message: result.message });
        return;
      }
      setState({ kind: "success", email: result.data.user.email });
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const loginHref = withReturnTo(
    emailHint ? `/login?email=${encodeURIComponent(emailHint)}` : "/login",
    nextPath,
  );

  if (state.kind === "pending-check") {
    return (
      <AuthCard
        title="Verifying email"
        description="Confirming your verification link…"
      >
        <div className="flex justify-center py-4">
          <Spinner className="size-6 text-primary" />
        </div>
      </AuthCard>
    );
  }

  if (state.kind === "awaiting-email") {
    return (
      <AuthCard
        title="Check your inbox"
        description="We sent a verification link to your email."
        footer={
          <Link
            href={loginHref}
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          {state.email
            ? `Look for a message sent to ${state.email}.`
            : "Open the link in the email to activate your account."}{" "}
          {nextPath && nextPath !== "/dashboard"
            ? "After you verify, sign in to continue joining your team."
            : "You can sign in after verification completes."}
        </p>
      </AuthCard>
    );
  }

  if (state.kind === "success") {
    const continueHref = withReturnTo(
      `/login?email=${encodeURIComponent(state.email)}`,
      nextPath,
    );
    return (
      <AuthCard
        title="Email verified"
        description={`${state.email} is ready to use.`}
        footer={
          <Link
            href={continueHref}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">
          {nextPath && nextPath !== "/dashboard"
            ? "Sign in to continue with your invitation."
            : "Continue to sign in to access your workspace."}
        </p>
        <Button asChild className="w-full">
          <Link href={continueHref}>
            {nextPath && nextPath !== "/dashboard"
              ? "Sign in to continue"
              : "Continue to sign in"}
          </Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verification failed"
      description="We could not verify this email link."
      footer={
        <Link href={loginHref} className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <p role="alert" className="text-sm text-destructive-strong">
        {state.message}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        If you already verified this email, continue to sign in. Otherwise
        request a new verification email by signing in (we will resend the
        link) or contact support if the problem continues.
      </p>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <AuthCard title="Verifying email" description="Loading…">
          <div className="flex justify-center py-4">
            <Spinner className="size-6 text-primary" />
          </div>
        </AuthCard>
      }
    >
      <VerifyEmailView />
    </React.Suspense>
  );
}
