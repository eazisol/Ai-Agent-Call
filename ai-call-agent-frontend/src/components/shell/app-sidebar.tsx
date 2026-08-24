"use client";

import { PhoneCall } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { portalBottomNav, portalNavGroups } from "@/mocks/portal-shell";
import { useShellNavigation } from "./shell-navigation";
import { OrganizationSwitcher } from "./organization-switcher";
import { BusinessSwitcher } from "./business-switcher";
import { SidebarNav } from "./sidebar-nav";
import { UsageIndicator } from "./usage-indicator";

/**
 * AppSidebar — Customer Portal navigation sidebar.
 *
 * Structure: brand → organization switcher → business selector →
 * grouped primary nav → (footer) usage summary + account nav.
 */
export function AppSidebar() {
  const { navigate } = useShellNavigation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-1 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="EaziAICall — Dashboard"
              onClick={() => navigate("/dashboard")}
              aria-label="EaziAICall home"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <PhoneCall className="size-4" aria-hidden="true" />
              </span>
              <span className="truncate font-display text-base font-semibold tracking-tight">
                EaziAICall
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="my-1" />
        <OrganizationSwitcher />
        <BusinessSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarNav groups={portalNavGroups} />
      </SidebarContent>

      <SidebarFooter className="gap-1 pb-3">
        <UsageIndicator />
        <SidebarNav groups={[portalBottomNav]} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
