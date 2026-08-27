"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Store } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useOptionalBusinessSession } from "@/components/businesses/business-session";
import {
  formatIndustry,
  type Business,
} from "@/lib/businesses-api";

/**
 * BusinessSwitcher — active business context from Businesses API (`eazi_biz`).
 * Does not alter Calls API queries in M04.
 */
export function BusinessSwitcher() {
  const router = useRouter();
  const session = useOptionalBusinessSession();
  const [switching, setSwitching] = React.useState(false);

  const businesses = (session?.businesses ?? []).filter(
    (row) => row.status === "active",
  );
  const active = session?.active ?? null;

  const onSwitch = async (businessId: string) => {
    if (!session || businessId === active?.id || switching) {
      return;
    }
    setSwitching(true);
    await session.switchBusiness(businessId);
    setSwitching(false);
  };

  if (!session || session.status === "loading") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton disabled className="opacity-70">
            <Store className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate text-sm text-muted-foreground">
              Loading businesses…
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (businesses.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => router.push("/businesses/new")}
            aria-label="Create business"
            className="text-sidebar-foreground/80"
          >
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">Create business</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const label = active?.name ?? "Select business";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={`Business: ${label}`}
              aria-label={`Business context: ${label}. Change business`}
              className="text-sidebar-foreground/80"
              disabled={switching}
            >
              <Store className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{label}</span>
              <ChevronsUpDown
                className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start" sideOffset={8}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Switch business
            </DropdownMenuLabel>
            {businesses.map((biz: Business) => (
              <DropdownMenuItem
                key={biz.id}
                onSelect={() => void onSwitch(biz.id)}
                className="gap-2.5"
              >
                <Store
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="grid flex-1 leading-tight">
                  <span className="truncate">{biz.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatIndustry(biz.industry, biz.industryLabel)}
                  </span>
                </span>
                {biz.id === active?.id ? (
                  <Check
                    className="size-4 shrink-0 text-primary"
                    aria-label="Current business"
                  />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/businesses")}>
              Manage businesses
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/businesses/new")}>
              <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
              Create business
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
