"use client";

import * as React from "react";
import Link from "next/link";
import { Users } from "lucide-react";

import { useAuthSession } from "@/components/auth/auth-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { FormField } from "@/components/patterns/form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  assignableRolesForTarget,
  canInviteMembers,
  canManageInvitations,
  canRemoveMemberUi,
  inviteRolesForActor,
  teamApi,
  type InviteAssignableRole,
  type TeamInvitation,
  type TeamMember,
} from "@/lib/team-api";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function TeamPage() {
  const { user } = useAuthSession();
  const { active, status: orgStatus, refresh: refreshOrg } =
    useOrganizationSession();

  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [invitations, setInvitations] = React.useState<TeamInvitation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] =
    React.useState<InviteAssignableRole>("viewer");
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteFieldError, setInviteFieldError] = React.useState<
    string | undefined
  >();
  const [inviteSubmitting, setInviteSubmitting] = React.useState(false);

  const [removeTarget, setRemoveTarget] = React.useState<TeamMember | null>(
    null,
  );
  const [removeBusy, setRemoveBusy] = React.useState(false);

  const [transferTarget, setTransferTarget] = React.useState<TeamMember | null>(
    null,
  );
  const [transferBusy, setTransferBusy] = React.useState(false);

  const [roleBusyId, setRoleBusyId] = React.useState<string | null>(null);
  const [cancelBusyId, setCancelBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!active) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    setError(null);

    const membersResult = await teamApi.listMembers(active.id);
    if (!membersResult.ok) {
      setError(membersResult.message);
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }
    setMembers(membersResult.data.members);

    if (canManageInvitations(active.role)) {
      const invitesResult = await teamApi.listInvitations(active.id);
      if (invitesResult.ok) {
        setInvitations(invitesResult.data.invitations);
      } else if (invitesResult.status !== 403) {
        setError(invitesResult.message);
      } else {
        setInvitations([]);
      }
    } else {
      setInvitations([]);
    }

    setLoading(false);
  }, [active]);

  React.useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    const organizationId = active.id;
    const role = active.role;

    void (async () => {
      const membersResult = await teamApi.listMembers(organizationId);
      if (cancelled) {
        return;
      }
      if (!membersResult.ok) {
        setError(membersResult.message);
        setMembers([]);
        setInvitations([]);
        setLoading(false);
        return;
      }
      setMembers(membersResult.data.members);

      if (canManageInvitations(role)) {
        const invitesResult = await teamApi.listInvitations(organizationId);
        if (cancelled) {
          return;
        }
        if (invitesResult.ok) {
          setInvitations(invitesResult.data.invitations);
        } else if (invitesResult.status !== 403) {
          setError(invitesResult.message);
        } else {
          setInvitations([]);
        }
      } else {
        setInvitations([]);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [active]);

  if (orgStatus === "loading") {
    return (
      <p className="text-sm text-muted-foreground">Loading organization…</p>
    );
  }

  if (!active) {
    return (
      <EmptyState
        icon={Users}
        title="No active organization"
        description="Create or select a workspace before managing the team."
        action={
          <Button asChild>
            <Link href="/onboarding/organization">Create organization</Link>
          </Button>
        }
      />
    );
  }

  const actorRole = active.role;
  const canInvite = canInviteMembers(actorRole);
  const showInvites = canManageInvitations(actorRole);
  const inviteRoleOptions = inviteRolesForActor(actorRole);

  const onInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setInviteFieldError("Enter a valid email address.");
      return;
    }
    setInviteFieldError(undefined);
    setInviteError(null);
    setInviteSubmitting(true);
    const result = await teamApi.createInvitation(active.id, {
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setInviteSubmitting(false);
    if (!result.ok) {
      setInviteError(
        result.code === "INVITATION_EMAIL_FAILED"
          ? `${result.message} Check SMTP settings and try again.`
          : result.message,
      );
      return;
    }
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("viewer");
    setNotice(`Invitation sent to ${result.data.invitation.email}.`);
    await load();
  };

  const onChangeRole = async (
    member: TeamMember,
    role: InviteAssignableRole,
  ) => {
    if (role === member.role) {
      return;
    }
    setRoleBusyId(member.id);
    setError(null);
    setNotice(null);
    const result = await teamApi.changeMemberRole(active.id, member.id, role);
    setRoleBusyId(null);
    if (!result.ok) {
      setError(result.message);
      await load();
      return;
    }
    setNotice(`Updated ${member.displayName} to ${formatRole(role)}.`);
    await load();
  };

  const confirmRemove = async () => {
    if (!removeTarget) {
      return;
    }
    setRemoveBusy(true);
    setError(null);
    setNotice(null);
    const result = await teamApi.removeMember(active.id, removeTarget.id);
    setRemoveBusy(false);
    if (!result.ok) {
      setError(result.message);
      setRemoveTarget(null);
      return;
    }
    setNotice(`Removed ${removeTarget.displayName} from the organization.`);
    setRemoveTarget(null);
    await load();
  };

  const confirmTransfer = async () => {
    if (!transferTarget) {
      return;
    }
    setTransferBusy(true);
    setError(null);
    setNotice(null);
    const result = await teamApi.transferOwnership(
      active.id,
      transferTarget.id,
    );
    setTransferBusy(false);
    if (!result.ok) {
      setError(result.message);
      setTransferTarget(null);
      return;
    }
    setNotice(
      `Ownership transferred to ${result.data.newOwner.displayName}. You are now an admin.`,
    );
    setTransferTarget(null);
    await refreshOrg();
    await load();
  };

  const cancelInvite = async (invitation: TeamInvitation) => {
    setCancelBusyId(invitation.id);
    setError(null);
    setNotice(null);
    const result = await teamApi.cancelInvitation(active.id, invitation.id);
    setCancelBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNotice(`Cancelled invitation for ${invitation.email}.`);
    await load();
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Team
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Members of{" "}
            <span className="font-medium text-foreground">{active.name}</span>.
            Your role:{" "}
            <span className="font-medium text-foreground">
              {formatRole(actorRole)}
            </span>
          </p>
        </div>
        {canInvite ? (
          <Button
            type="button"
            onClick={() => {
              const roles = inviteRolesForActor(actorRole);
              setInviteRole(roles[0] ?? "viewer");
              setInviteEmail("");
              setInviteError(null);
              setInviteFieldError(undefined);
              setInviteOpen(true);
            }}
          >
            Invite member
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive-strong">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-success-strong">
          {notice}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Members</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading members…</p>
        ) : error && members.length === 0 ? (
          <p className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground">
            Members could not be loaded. Retry after the API is available.
          </p>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invite a teammate to collaborate in this workspace."
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {members.map((member) => {
              const isSelf = user?.id === member.userId;
              const roleOptions = assignableRolesForTarget(
                actorRole,
                member.role,
              );
              const canRemove = canRemoveMemberUi(actorRole, member.role);
              const canTransfer =
                actorRole === "owner" &&
                !isSelf &&
                member.role !== "owner";

              return (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.displayName}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {roleOptions.length > 0 ? (
                      <select
                        className={cn(selectClassName, "w-[8.5rem]")}
                        value={member.role}
                        disabled={roleBusyId === member.id}
                        aria-label={`Role for ${member.displayName}`}
                        onChange={(event) => {
                          void onChangeRole(
                            member,
                            event.target.value as InviteAssignableRole,
                          );
                        }}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {formatRole(role)}
                          </option>
                        ))}
                        {!roleOptions.includes(
                          member.role as InviteAssignableRole,
                        ) ? (
                          <option value={member.role}>
                            {formatRole(member.role)}
                          </option>
                        ) : null}
                      </select>
                    ) : (
                      <span className="rounded-md border px-2.5 py-1 text-xs font-medium text-foreground">
                        {formatRole(member.role)}
                      </span>
                    )}
                    {canTransfer ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTransferTarget(member)}
                      >
                        Make owner
                      </Button>
                    ) : null}
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive-strong"
                        onClick={() => setRemoveTarget(member)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showInvites ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            Pending invitations
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading invitations…</p>
          ) : invitations.length === 0 ? (
            <p className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground">
              No pending invitations.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRole(invitation.role)} · expires{" "}
                      {formatExpiry(invitation.expiresAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cancelBusyId === invitation.id}
                    onClick={() => void cancelInvite(invitation)}
                  >
                    {cancelBusyId === invitation.id ? "Cancelling…" : "Cancel"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              We’ll email an invitation link. They must sign in with the same
              address to accept.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void onInviteSubmit(e)}>
            <FormField
              label="Email"
              htmlFor="invite-email"
              required
              error={inviteFieldError}
            >
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviteSubmitting}
                aria-invalid={Boolean(inviteFieldError)}
              />
            </FormField>
            <FormField label="Role" htmlFor="invite-role" required>
              <select
                id="invite-role"
                className={selectClassName}
                value={inviteRole}
                disabled={inviteSubmitting || inviteRoleOptions.length === 0}
                onChange={(e) =>
                  setInviteRole(e.target.value as InviteAssignableRole)
                }
              >
                {inviteRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </FormField>
            {inviteError ? (
              <p role="alert" className="text-sm text-destructive-strong">
                {inviteError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={inviteSubmitting}
                onClick={() => setInviteOpen(false)}
              >
                Close
              </Button>
              <Button type="submit" disabled={inviteSubmitting}>
                {inviteSubmitting ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open && !removeBusy) {
            setRemoveTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `${removeTarget.displayName} (${removeTarget.email}) will lose access to ${active.name}.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemove();
              }}
            >
              {removeBusy ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(transferTarget)}
        onOpenChange={(open) => {
          if (!open && !transferBusy) {
            setTransferTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              {transferTarget
                ? `${transferTarget.displayName} will become the owner. You will be demoted to admin. This cannot be undone without another transfer.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={transferBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmTransfer();
              }}
            >
              {transferBusy ? "Transferring…" : "Transfer ownership"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
