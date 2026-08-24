"use client";

import * as React from "react";
import { Building2, Check, ChevronsUpDown, Plus, Search, Settings } from "lucide-react";

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
import {
  organizations,
  currentOrganizationId,
  type PortalOrganization,
} from "@/mocks/portal-shell";
import { toastComingSoon } from "./portal-nav";

/**
 * OrganizationSwitcher — workspace-level context control (UI chrome only).
 * Does not change Calls queries or tenant filtering in Phase 3.
 */
export interface OrganizationSwitcherProps {
  orgs?: PortalOrganization[];
  currentId?: string;
  onSwitch?: (orgId: string) => void;
  onCreate?: () => void;
  onSettings?: () => void;
}

export function OrganizationSwitcher({
  orgs = organizations,
  currentId = currentOrganizationId,
  onSwitch,
  onCreate,
  onSettings,
}: OrganizationSwitcherProps) {
  const [query, setQuery] = React.useState("");
  const current = orgs.find((o) => o.id === currentId) ?? orgs[0];
  const filtered = orgs.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  if (!current) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={current.name}
              aria-label={`Organization: ${current.name}. Open organization switcher`}
              className="border border-transparent hover:border-border data-[state=open]:border-border data-[state=open]:bg-muted/60"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" aria-hidden="true" />
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{current.name}</span>
                <span className="truncate text-xs text-muted-foreground">{current.plan} plan</span>
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
              filtered.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onSelect={() =>
                    onSwitch
                      ? onSwitch(org.id)
                      : toastComingSoon("Organization switching arrives with Auth & tenancy.")
                  }
                  className="gap-2.5"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-muted">
                    <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="flex-1 truncate">{org.name}</span>
                  {org.id === current.id ? (
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
              onSelect={() =>
                onCreate
                  ? onCreate()
                  : toastComingSoon("Create organization arrives with Organizations.")
              }
            >
              <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
              Create organization
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                onSettings
                  ? onSettings()
                  : toastComingSoon("Organization settings arrive with Organizations.")
              }
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
