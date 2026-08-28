"use client";

import Link from "next/link";
import { Building2, Plug, Settings2 } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { Button } from "@/components/ui/button";

const links = [
  {
    href: "/settings/organization",
    title: "Organization",
    description: "Workspace name, slug, and membership context.",
    icon: Building2,
  },
  {
    href: "/settings/integrations",
    title: "Integrations",
    description: "Telephony provider health and webhook configuration.",
    icon: Plug,
  },
] as const;

export default function SettingsPage() {
  const { active } = useOrganizationSession();

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage workspace settings and review connected platform integrations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg border bg-muted/40 p-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {active ? (
        <p className="text-xs text-muted-foreground">
          Active workspace: {active.name} · role {active.role}
        </p>
      ) : (
        <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          <Settings2 className="mb-2 size-4" aria-hidden />
          Select or create an organization to manage integration settings.
        </div>
      )}
    </div>
  );
}
