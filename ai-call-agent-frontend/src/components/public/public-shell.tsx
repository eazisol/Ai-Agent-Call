"use client";

import * as React from "react";
import { ChevronDown, Menu, PhoneCall } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  industries,
  publicActions,
  publicFooterGroups,
  publicNavLinks,
  type PublicNavLink,
} from "@/mocks/marketing-shell";
import { useShellNavigation } from "@/components/shell/shell-navigation";

/**
 * PublicShell — reusable marketing/public website shell.
 *
 * Sticky header + content + grouped footer. Same tokens/components as
 * authenticated shells. Portable via ShellNavigationProvider.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

function BrandLockup() {
  const { navigate } = useShellNavigation();
  return (
    <a
      href="/marketing-shell"
      aria-label="EaziAICall home"
      onClick={(e) => {
        e.preventDefault();
        navigate("/marketing-shell");
      }}
      className="flex items-center gap-2.5"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <PhoneCall className="size-4" aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">EaziAICall</span>
    </a>
  );
}

const navLinkClasses =
  "rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function PublicHeader() {
  const { currentPath, navigate } = useShellNavigation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const go = (href: string) => {
    setMobileOpen(false);
    navigate(href);
  };

  const link = (item: PublicNavLink) => (
    <a
      key={item.href}
      href={item.href}
      aria-current={currentPath === item.href ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        navigate(item.href);
      }}
      className={cn(navLinkClasses, currentPath === item.href && "text-primary")}
    >
      {item.label}
    </a>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLockup />

        <nav aria-label="Primary" className="mx-auto hidden items-center gap-1 lg:flex">
          {publicNavLinks.slice(0, 2).map(link)}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                navLinkClasses,
                "flex items-center gap-1 outline-none data-[state=open]:text-foreground",
                currentPath.startsWith("/industries") && "text-primary",
              )}
            >
              Industries
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {industries.map((industry) => (
                <DropdownMenuItem key={industry.href} onSelect={() => navigate(industry.href)}>
                  {industry.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {publicNavLinks.slice(2).map(link)}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => navigate(publicActions.login.href)}
          >
            {publicActions.login.label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => navigate(publicActions.bookDemo.href)}
          >
            {publicActions.bookDemo.label}
          </Button>
          <Button size="sm" onClick={() => navigate(publicActions.startTrial.href)}>
            {publicActions.startTrial.label}
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-80 flex-col gap-0 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <PhoneCall className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-display text-lg font-semibold tracking-tight">
                    EaziAICall
                  </span>
                </SheetTitle>
                <SheetDescription className="sr-only">Marketing site navigation</SheetDescription>
              </SheetHeader>

              <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-0.5">
                  {[...publicNavLinks.slice(0, 2)].map((item) => (
                    <li key={item.href}>
                      <MobileNavLink item={item} currentPath={currentPath} onNavigate={go} />
                    </li>
                  ))}
                </ul>
                <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Industries
                </p>
                <ul className="space-y-0.5">
                  {industries.map((item) => (
                    <li key={item.href}>
                      <MobileNavLink item={item} currentPath={currentPath} onNavigate={go} />
                    </li>
                  ))}
                </ul>
                <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Company
                </p>
                <ul className="space-y-0.5">
                  {publicNavLinks.slice(2).map((item) => (
                    <li key={item.href}>
                      <MobileNavLink item={item} currentPath={currentPath} onNavigate={go} />
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="space-y-2 border-t p-4">
                <Button variant="ghost" className="w-full" onClick={() => go(publicActions.login.href)}>
                  {publicActions.login.label}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => go(publicActions.bookDemo.href)}
                >
                  {publicActions.bookDemo.label}
                </Button>
                <Button className="w-full" onClick={() => go(publicActions.startTrial.href)}>
                  {publicActions.startTrial.label}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function MobileNavLink({
  item,
  currentPath,
  onNavigate,
}: {
  item: PublicNavLink;
  currentPath: string;
  onNavigate: (href: string) => void;
}) {
  const active = currentPath === item.href;
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(item.href);
      }}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
      )}
    >
      {item.label}
    </a>
  );
}

export function PublicFooter() {
  const { navigate } = useShellNavigation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <BrandLockup />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              AI receptionists that answer every call for your business.
            </p>
          </div>

          {publicFooterGroups.map((group) => (
            <nav key={group.title} aria-label={`Footer — ${group.title}`}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.href);
                      }}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <span className="font-display text-sm font-semibold tracking-tight">EaziAICall</span>
          <p className="text-xs text-muted-foreground">
            © {year} EaziAICall. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
