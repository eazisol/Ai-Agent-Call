"use client";

import * as React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { FormField } from "@/components/patterns/form-field";
import { EmptyState } from "@/components/patterns/empty-state";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { organizationsApi } from "@/lib/organizations-api";

export default function OrganizationSettingsPage() {
  const { active, refresh, status } = useOrganizationSession();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!active) {
      return;
    }
    setName(active.name);
    setSlug(active.slug ?? "");
  }, [active]);

  if (status === "loading") {
    return (
      <p className="text-sm text-muted-foreground">Loading organization…</p>
    );
  }

  if (!active) {
    return (
      <EmptyState
        icon={Building2}
        title="No active organization"
        description="Create or select a workspace before editing settings."
        action={
          <Button asChild>
            <Link href="/onboarding/organization">Create organization</Link>
          </Button>
        }
      />
    );
  }

  const canEdit = active.role === "owner";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) {
      return;
    }
    if (!name.trim()) {
      setFieldError("Organization name is required.");
      return;
    }
    setFieldError(undefined);
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    const result = await organizationsApi.update(active.id, {
      name: name.trim(),
      slug: slug.trim() ? slug.trim() : null,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess("Organization settings saved.");
    await refresh();
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Organization settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canEdit
            ? "Update the name and slug for your active workspace."
            : "You can view this workspace. Only owners can change settings."}
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border bg-card p-6"
        onSubmit={(e) => void onSubmit(e)}
        noValidate
      >
        <FormField
          label="Organization name"
          htmlFor="settings-org-name"
          required
          error={fieldError}
        >
          <Input
            id="settings-org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting || !canEdit}
            aria-invalid={Boolean(fieldError)}
          />
        </FormField>
        <FormField label="Slug" htmlFor="settings-org-slug">
          <Input
            id="settings-org-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={submitting || !canEdit}
            placeholder="optional"
          />
        </FormField>
        <p className="text-xs text-muted-foreground">
          Your role: <span className="font-medium text-foreground">{active.role}</span>
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-sm text-success-strong">
            {success}
          </p>
        ) : null}
        {canEdit ? (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        ) : null}
      </form>
    </div>
  );
}
