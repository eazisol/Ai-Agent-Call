"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useShellNavigation } from "./shell-navigation";
import { isNavItemActive } from "./portal-nav";
import type { ShellNavGroup, ShellNavItem } from "@/mocks/portal-shell";

/**
 * SidebarNav — grouped primary navigation.
 *
 * Active treatment: subtle primary-tinted background, primary icon/text,
 * slim left indicator bar. Collapsed rail: icons + tooltips.
 */
export function SidebarNav({ groups }: { groups: ShellNavGroup[] }) {
  return (
    <>
      {groups.map((group) =>
        group.collapsible ? (
          <CollapsibleNavGroup key={group.id} group={group} />
        ) : (
          <SidebarGroup key={group.id}>
            {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <NavMenu items={group.items} />
            </SidebarGroupContent>
          </SidebarGroup>
        ),
      )}
    </>
  );
}

function NavMenu({ items }: { items: ShellNavItem[] }) {
  return (
    <SidebarMenu>
      {items.map((item) =>
        item.children?.length ? (
          <NavParent key={item.id} item={item} />
        ) : (
          <NavLeaf key={item.id} item={item} />
        ),
      )}
    </SidebarMenu>
  );
}

function CollapsibleNavGroup({ group }: { group: ShellNavGroup }) {
  const { currentPath } = useShellNavigation();
  const { state } = useSidebar();
  const iconCollapsed = state === "collapsed";

  const containsActive = group.items.some(
    (item) =>
      isNavItemActive(currentPath, item.href) ||
      item.children?.some((c) => isNavItemActive(currentPath, c.href)),
  );
  const [open, setOpen] = React.useState(containsActive || group.defaultOpen === true);

  return (
    <Collapsible open={iconCollapsed || open} onOpenChange={setOpen} className="group/navgroup">
      <SidebarGroup>
        {group.label ? (
          <SidebarGroupLabel>
            <CollapsibleTrigger
              className="flex w-full items-center justify-between gap-2 outline-none"
              aria-label={`Toggle ${group.label} navigation group`}
            >
              <span className="truncate">{group.label}</span>
              <ChevronRight
                className="size-3.5 shrink-0 transition-transform group-data-[state=open]/navgroup:rotate-90"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
        ) : null}
        <CollapsibleContent>
          <SidebarGroupContent>
            <NavMenu items={group.items} />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

const activeClasses = "bg-primary/10 text-primary font-medium hover:bg-primary/15";

function ActiveIndicator() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
    />
  );
}

function NavLeaf({ item }: { item: ShellNavItem }) {
  const { currentPath, navigate } = useShellNavigation();
  const active = isNavItemActive(currentPath, item.href);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.label}
        className={cn("relative", active && activeClasses)}
      >
        <a
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={(e) => {
            e.preventDefault();
            navigate(item.href);
          }}
        >
          {active ? <ActiveIndicator /> : null}
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavParent({ item }: { item: ShellNavItem }) {
  const { currentPath, navigate } = useShellNavigation();
  const childActive = item.children!.some((c) => isNavItemActive(currentPath, c.href));

  return (
    <Collapsible defaultOpen={childActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            aria-label={`${item.label} submenu`}
            className={cn(childActive && "text-primary font-medium")}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
            <ChevronRight
              className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90"
              aria-hidden="true"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => {
              const active = isNavItemActive(currentPath, child.href);
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton asChild className={cn(active && activeClasses)}>
                    <a
                      href={child.href}
                      aria-current={active ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(child.href);
                      }}
                    >
                      <span className="truncate">{child.label}</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
