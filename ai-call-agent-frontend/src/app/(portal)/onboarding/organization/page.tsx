"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

import { FormField } from "@/components/patterns/form-field";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OrganizationOnboardingPage() {
  const router = useRouter();
  const { createOrganization } = useOrganizationSession();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFieldError("Organization name is required.");
      return;
    }
    setFieldError(undefined);
    setError(null);
    setSubmitting(true);
    const result = await createOrganization({
      name: name.trim(),
      slug: slug.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Organizations are the tenant boundary for your team. You can add more
          workspaces later.
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border bg-card p-6 shadow-card"
        onSubmit={(e) => void onSubmit(e)}
        noValidate
      >
        <FormField
          label="Organization name"
          htmlFor="org-name"
          required
          error={fieldError}
        >
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            placeholder="Acme Health"
            aria-invalid={Boolean(fieldError)}
          />
        </FormField>
        <FormField
          label="Slug"
          htmlFor="org-slug"
          description="Optional URL-safe identifier. Leave blank to generate from the name."
        >
          <Input
            id="org-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={submitting}
            placeholder="acme-health"
          />
        </FormField>
        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create organization"}
        </Button>
      </form>
    </div>
  );
}
