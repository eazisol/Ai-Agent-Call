"use client";

import * as React from "react";
import { Building2, Check, ChevronsUpDown, Plus, Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useOptionalOrganizationSession } from "@/components/organizations/organization-session";
import type { Organization } from "@/lib/organizations-api";

/**
 * OrganizationSwitcher — real workspace context from Organizations API.
 */
export function OrganizationSwitcher() {
  const router = useRouter();
  const session = useOptionalOrganizationSession();
  const [query, setQuery] = React.useState("");
  const [switching, setSwitching] = React.useState(false);

  const orgs = session?.organizations ?? [];
  const active = session?.active ?? null;
  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const onSwitch = async (orgId: string) => {
    if (!session || orgId === active?.id || switching) {
      return;
    }
    setSwitching(true);
    await session.switchOrganization(orgId);
    setSwitching(false);
  };

  if (!session || session.status === "loading") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled className="opacity-70">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
            </span>
            <span className="truncate text-sm text-muted-foreground">Loading…</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (orgs.length === 0 || !active) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => router.push("/onboarding/organization")}
            aria-label="Create organization"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Create organization</span>
              <span className="truncate text-xs text-muted-foreground">
                No workspace yet
              </span>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={active.name}
              aria-label={`Organization: ${active.name}. Open organization switcher`}
              className="border border-transparent hover:border-border data-[state=open]:border-border data-[state=open]:bg-muted/60"
              disabled={switching}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" aria-hidden="true" />
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{active.name}</span>
                <span className="truncate text-xs capitalize text-muted-foreground">
                  {active.role}
                </span>
              </span>
              <ChevronsUpDown
                className="ml-auto size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start" sideOffset={8}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Switch organization
            </DropdownMenuLabel>
            <div className="px-2 pb-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search organizations…"
                  aria-label="Search organizations"
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="px-2 pb-3 pt-1 text-center text-sm text-muted-foreground">
                No organizations found.
              </p>
            ) : (
              filtered.map((org: Organization) => (
                <DropdownMenuItem
                  key={org.id}
                  onSelect={() => void onSwitch(org.id)}
                  className="gap-2.5"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-muted">
                    <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="flex-1 truncate">{org.name}</span>
                  {org.id === active.id ? (
                    <Check
                      className="size-4 shrink-0 text-primary"
                      aria-label="Current organization"
                    />
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => router.push("/onboarding/organization")}
            >
              <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
              Create organization
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => router.push("/settings/organization")}
            >
              <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
              Organization settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
