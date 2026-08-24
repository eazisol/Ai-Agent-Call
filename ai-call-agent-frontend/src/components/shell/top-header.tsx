"use client";

import * as React from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { PortalNotification, PortalUser, SearchResultGroup } from "@/mocks/portal-shell";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { SearchPalette, SearchTrigger } from "./global-search";
import { NotificationMenu } from "./notifications-menu";
import { HelpMenu } from "./help-menu";
import { UserMenu } from "./user-menu";

/**
 * TopHeader — restrained portal header.
 *
 * Left: sidebar toggle + breadcrumbs. Center: command search (desktop
 * field, mobile icon in the right cluster). Right: notifications, help,
 * account menu.
 */
export interface TopHeaderProps {
  breadcrumbs: Crumb[];
  user?: PortalUser | undefined;
  notifications?: PortalNotification[] | undefined;
  searchGroups?: SearchResultGroup[] | undefined;
  searchPlaceholder?: string | undefined;
}

export function TopHeader({
  breadcrumbs,
  user,
  notifications,
  searchGroups,
  searchPlaceholder,
}: TopHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger aria-label="Toggle navigation sidebar" />
      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
      <div className="hidden min-w-0 sm:block">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="hidden flex-1 justify-center px-4 md:flex">
        <SearchTrigger variant="field" onClick={() => setSearchOpen(true)} />
      </div>
      <div className="flex-1 md:hidden" />

      <nav aria-label="Header actions" className="flex items-center gap-1">
        <SearchTrigger variant="icon" className="md:hidden" onClick={() => setSearchOpen(true)} />
        <NotificationMenu items={notifications} />
        <HelpMenu />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <UserMenu user={user} />
      </nav>

      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        groups={searchGroups}
        placeholder={searchPlaceholder}
      />
    </header>
  );
}
