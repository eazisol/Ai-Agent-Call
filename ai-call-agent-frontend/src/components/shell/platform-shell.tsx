"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type {
  PortalNotification,
  PortalUser,
  SearchResultGroup,
  ShellNavGroup,
} from "@/mocks/portal-shell";
import { useShellNavigation } from "./shell-navigation";
import { SidebarNav } from "./sidebar-nav";
import { TopHeader } from "./top-header";
import type { Crumb } from "./breadcrumbs";

/**
 * PlatformShell — reusable authenticated shell for Admin (and later
 * Developer / Ops / Partner portals).
 *
 * Shares Customer Portal architecture without org/business switchers.
 * Portable: no router imports — wrap in ShellNavigationProvider.
 */
export interface PlatformBrand {
  label: string;
  icon: LucideIcon;
  homeHref: string;
  /** Small chip next to the brand label, e.g. "Admin". */
  badge?: string;
}

export interface PlatformShellProps {
  brand: PlatformBrand;
  navGroups: ShellNavGroup[];
  bottomGroups?: ShellNavGroup[] | undefined;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  user?: PortalUser | undefined;
  notifications?: PortalNotification[] | undefined;
  searchGroups?: SearchResultGroup[] | undefined;
  searchPlaceholder?: string | undefined;
  breadcrumbs: Crumb[];
  children: React.ReactNode;
  contentClassName?: string | undefined;
}

export function PlatformShell({
  brand,
  navGroups,
  bottomGroups,
  headerSlot,
  footerSlot,
  user,
  notifications,
  searchGroups,
  searchPlaceholder,
  breadcrumbs,
  children,
  contentClassName,
}: PlatformShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
    const next = match ? match[1] === "true" : window.innerWidth > 1024;
    const id = window.setTimeout(() => setSidebarOpen(next), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{ "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}
    >
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <PlatformSidebar
        brand={brand}
        navGroups={navGroups}
        bottomGroups={bottomGroups}
        headerSlot={headerSlot}
        footerSlot={footerSlot}
      />
      <SidebarInset>
        <TopHeader
          breadcrumbs={breadcrumbs}
          user={user}
          notifications={notifications}
          searchGroups={searchGroups}
          searchPlaceholder={searchPlaceholder}
        />
        <main id="main-content" tabIndex={-1} className="flex-1">
          <div
            className={cn(
              "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
              contentClassName,
            )}
          >
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface PlatformSidebarProps {
  brand: PlatformBrand;
  navGroups: ShellNavGroup[];
  bottomGroups?: ShellNavGroup[] | undefined;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
}

function PlatformSidebar({
  brand,
  navGroups,
  bottomGroups,
  headerSlot,
  footerSlot,
}: PlatformSidebarProps) {
  const { navigate } = useShellNavigation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-1 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={brand.badge ? `${brand.label} — ${brand.badge}` : brand.label}
              onClick={() => navigate(brand.homeHref)}
              aria-label={`${brand.label} home`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <brand.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate font-display text-base font-semibold tracking-tight">
                  {brand.label}
                </span>
                {brand.badge ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {brand.badge}
                  </Badge>
                ) : null}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {headerSlot ? (
          <>
            <SidebarSeparator className="my-1" />
            {headerSlot}
          </>
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <SidebarNav groups={navGroups} />
      </SidebarContent>

      {footerSlot || bottomGroups?.length ? (
        <SidebarFooter className="gap-1 pb-3">
          {footerSlot}
          {bottomGroups?.length ? <SidebarNav groups={bottomGroups} /> : null}
        </SidebarFooter>
      ) : null}

      <SidebarRail />
    </Sidebar>
  );
}
