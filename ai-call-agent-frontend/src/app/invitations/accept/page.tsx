"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { useAuthSession } from "@/components/auth/auth-session";
import { Spinner } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import {
  clearInviteReturn,
  rememberInviteReturn,
} from "@/lib/invite-return";
import {
  invitationAcceptPath,
  withReturnTo,
} from "@/lib/safe-return-path";
import {
  teamApi,
  type InvitationPreview,
} from "@/lib/team-api";

type PageState =
  | { kind: "loading" }
  | { kind: "preview"; preview: InvitationPreview }
  | { kind: "accepting"; preview: InvitationPreview }
  | {
      kind: "success";
      organizationName: string;
      alreadyMember: boolean;
    }
  | { kind: "network-error"; message: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function formatRole(role: string | null | undefined): string {
  if (!role) {
    return "Member";
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

function InviteDetails({ preview }: { preview: InvitationPreview }) {
  const expiry = formatExpiry(preview.expiresAt);
  return (
    <dl className="mt-4 space-y-2 text-sm">
      {preview.invitedEmail ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Invited email</dt>
          <dd className="truncate font-medium text-foreground">
            {preview.invitedEmail}
          </dd>
        </div>
      ) : null}
      {preview.role ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Role</dt>
          <dd className="font-medium text-foreground">
            {formatRole(preview.role)}
          </dd>
        </div>
      ) : null}
      {preview.invitedByDisplayName ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Invited by</dt>
          <dd className="truncate font-medium text-foreground">
            {preview.invitedByDisplayName}
          </dd>
        </div>
      ) : null}
      {expiry && preview.status === "valid" ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Expires</dt>
          <dd className="font-medium text-foreground">{expiry}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function authLinks(acceptPath: string, invitedEmail: string | null) {
  const loginBase = invitedEmail
    ? `/login?email=${encodeURIComponent(invitedEmail)}`
    : "/login";
  const registerBase = invitedEmail
    ? `/register?email=${encodeURIComponent(invitedEmail)}&lockEmail=1`
    : "/register";
  return {
    login: withReturnTo(loginBase, acceptPath),
    register: withReturnTo(registerBase, acceptPath),
  };
}

function AcceptInvitationView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const router = useRouter();
  const { status, user, logout } = useAuthSession();

  const [state, setState] = React.useState<PageState>(() =>
    token
      ? { kind: "loading" }
      : {
          kind: "network-error",
          message: "This invitation link is missing required information.",
        },
  );
  const [acceptError, setAcceptError] = React.useState<string | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);

  const acceptPath = token ? invitationAcceptPath(token) : "/invitations/accept";

  React.useEffect(() => {
    if (acceptPath.startsWith("/invitations/accept")) {
      rememberInviteReturn(acceptPath);
    }
  }, [acceptPath]);

  React.useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await teamApi.previewInvitation(token);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setState({ kind: "network-error", message: result.message });
        return;
      }
      setState({ kind: "preview", preview: result.data.invitation });
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onJoin = async (preview: InvitationPreview) => {
    if (!token) {
      return;
    }
    setAcceptError(null);
    setState({ kind: "accepting", preview });
    const result = await teamApi.acceptInvitation(token);
    if (!result.ok) {
      if (result.code === "INVITATION_EMAIL_MISMATCH") {
        setState({ kind: "preview", preview });
        setAcceptError("mismatch");
        return;
      }
      setState({ kind: "preview", preview });
      setAcceptError(result.message);
      return;
    }
    setState({
      kind: "success",
      organizationName: preview.organizationName ?? "your team",
      alreadyMember: Boolean(result.data.alreadyMember),
    });
    clearInviteReturn();
    window.setTimeout(() => {
      router.replace("/team");
    }, 1000);
  };

  const onSignOutAndContinue = async (invitedEmail: string | null) => {
    setSigningOut(true);
    await logout();
    setSigningOut(false);
    const links = authLinks(acceptPath, invitedEmail);
    router.replace(links.login);
  };

  if (!token || state.kind === "network-error") {
    return (
      <AuthCard
        title="Invitation unavailable"
        description="We could not open this invitation."
        footer={
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        }
      >
        <p role="alert" className="text-sm text-muted-foreground">
          {state.kind === "network-error"
            ? state.message
            : "Ask your teammate to send a new invitation."}
        </p>
      </AuthCard>
    );
  }

  if (state.kind === "loading" || status === "loading") {
    return (
      <AuthCard title="Invitation" description="Loading invitation details…">
        <div className="flex justify-center py-4">
          <Spinner className="size-6 text-primary" />
        </div>
      </AuthCard>
    );
  }

  if (state.kind === "success") {
    return (
      <AuthCard
        title={
          state.alreadyMember
            ? "You're already on this team"
            : "Welcome aboard"
        }
        description={
          state.alreadyMember
            ? `You're already a member of ${state.organizationName}.`
            : `You joined ${state.organizationName}.`
        }
      >
        <div className="flex justify-center py-2">
          <Spinner className="size-6 text-primary" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Opening your workspace…
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href="/team">Open workspace</Link>
        </Button>
      </AuthCard>
    );
  }

  if (state.kind === "accepting") {
    return (
      <AuthCard title="Joining team" description="Confirming your membership…">
        <div className="flex justify-center py-4">
          <Spinner className="size-6 text-primary" />
        </div>
      </AuthCard>
    );
  }

  const { preview } = state;
  const links = authLinks(acceptPath, preview.invitedEmail);
  const orgName = preview.organizationName ?? "a team";

  if (preview.status === "invalid") {
    return (
      <AuthCard
        title="Invitation unavailable"
        description="This invitation link is invalid or no longer works."
      >
        <p className="text-sm text-muted-foreground">
          Ask an owner or admin to send a new invitation.
        </p>
      </AuthCard>
    );
  }

  if (preview.status === "expired") {
    return (
      <AuthCard
        title="Invitation expired"
        description={`Your invitation to ${orgName} has expired.`}
      >
        <InviteDetails preview={preview} />
        <p className="mt-4 text-sm text-muted-foreground">
          Ask an owner or admin to send a new invitation.
        </p>
      </AuthCard>
    );
  }

  if (preview.status === "cancelled") {
    return (
      <AuthCard
        title="Invitation cancelled"
        description={`The invitation to ${orgName} was cancelled.`}
      >
        <InviteDetails preview={preview} />
        <p className="mt-4 text-sm text-muted-foreground">
          Contact your teammate if you still need access.
        </p>
      </AuthCard>
    );
  }

  if (preview.status === "accepted") {
    return (
      <AuthCard
        title="Invitation already used"
        description={`This invitation to ${orgName} was already accepted.`}
      >
        <InviteDetails preview={preview} />
        <Button asChild className="mt-4 w-full">
          <Link href={status === "authenticated" ? "/team" : links.login}>
            {status === "authenticated" ? "Open workspace" : "Sign in"}
          </Link>
        </Button>
      </AuthCard>
    );
  }

  if (status === "authenticated" && user) {
    const mismatch =
      acceptError === "mismatch" ||
      (preview.invitedEmail
        ? normalizeEmail(user.email) !== normalizeEmail(preview.invitedEmail)
        : false);

    if (mismatch) {
      return (
        <AuthCard
          title="Wrong account"
          description={`This invitation was sent to ${preview.invitedEmail}. You're currently signed in as ${user.email}.`}
        >
          <InviteDetails preview={preview} />
          <div className="mt-4 space-y-2">
            <Button
              type="button"
              className="w-full"
              disabled={signingOut}
              onClick={() => void onSignOutAndContinue(preview.invitedEmail)}
            >
              {signingOut ? "Signing out…" : "Sign in with invited account"}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Stay signed in</Link>
            </Button>
          </div>
        </AuthCard>
      );
    }

    return (
      <AuthCard title="You've been invited to join" description={orgName}>
        <InviteDetails preview={preview} />
        {acceptError ? (
          <p role="alert" className="mt-3 text-sm text-destructive-strong">
            {acceptError}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-4 w-full"
          onClick={() => void onJoin(preview)}
        >
          Join team
        </Button>
      </AuthCard>
    );
  }

  if (preview.accountState === "existing") {
    return (
      <AuthCard title="You've been invited to join" description={orgName}>
        <InviteDetails preview={preview} />
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with the invited email to continue.
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href={links.login}>Sign in to join</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="You've been invited to join" description={orgName}>
      <InviteDetails preview={preview} />
      <p className="mt-3 text-sm text-muted-foreground">
        Create an account with the invited email to continue. You&apos;ll verify
        your email before joining the team.
      </p>
      <Button asChild className="mt-4 w-full">
        <Link href={links.register}>Create account to join</Link>
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link href={links.login} className="font-medium text-primary hover:underline">
          Sign in to join
        </Link>
      </p>
    </AuthCard>
  );
}

export default function AcceptInvitationPage() {
  return (
    <React.Suspense
      fallback={
        <AuthCard title="Invitation" description="Loading…">
          <div className="flex justify-center py-4">
            <Spinner className="size-6 text-primary" />
          </div>
        </AuthCard>
      }
    >
      <AcceptInvitationView />
    </React.Suspense>
  );
}
