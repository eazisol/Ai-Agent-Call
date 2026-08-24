"use client";

import { Check, ChevronsUpDown, LayoutGrid, Store } from "lucide-react";

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
  allBusinessesId,
  businesses,
  currentBusinessId,
  type PortalBusiness,
} from "@/mocks/portal-shell";
import { toastComingSoon } from "./portal-nav";

/**
 * BusinessSwitcher — UI chrome only. Does not alter Calls API queries.
 */
export interface BusinessSwitcherProps {
  businesses?: PortalBusiness[];
  currentId?: string;
  onSwitch?: (businessId: string) => void;
}

export function BusinessSwitcher({
  businesses: items = businesses,
  currentId = currentBusinessId,
  onSwitch,
}: BusinessSwitcherProps) {
  const current =
    currentId === allBusinessesId
      ? { id: allBusinessesId, name: "All businesses", industry: `${items.length} businesses` }
      : items.find((b) => b.id === currentId);

  const select = (id: string) => {
    if (onSwitch) onSwitch(id);
    else toastComingSoon("Business context switching arrives with Businesses.");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={`Business: ${current?.name ?? "Select"}`}
              aria-label={`Business context: ${current?.name}. Change business`}
              className="text-sidebar-foreground/80"
            >
              <Store className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{current?.name}</span>
              <ChevronsUpDown
                className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" sideOffset={8}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Business context
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => select(allBusinessesId)} className="gap-2.5">
              <LayoutGrid className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 truncate">All businesses</span>
              {currentId === allBusinessesId ? (
                <Check className="size-4 shrink-0 text-primary" aria-label="Current context" />
              ) : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {items.map((biz) => (
              <DropdownMenuItem key={biz.id} onSelect={() => select(biz.id)} className="gap-2.5">
                <Store className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="grid flex-1 leading-tight">
                  <span className="truncate">{biz.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{biz.industry}</span>
                </span>
                {biz.id === currentId ? (
                  <Check className="size-4 shrink-0 text-primary" aria-label="Current business" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
