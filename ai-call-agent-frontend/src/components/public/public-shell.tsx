"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, PhoneCall } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  MARKETING_PRODUCT_NAME,
  marketingAuthCtas,
  marketingFooterGroups,
  marketingHeaderNav,
  type MarketingNavLink,
} from "@/content/marketing";
import { useShellNavigation } from "@/components/shell/shell-navigation";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

function BrandLockup({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label={`${MARKETING_PRODUCT_NAME} home`}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <PhoneCall className="size-4" aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        {MARKETING_PRODUCT_NAME}
      </span>
    </Link>
  );
}

const navLinkClasses =
  "rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function isActivePath(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function PublicHeader() {
  const { currentPath } = useShellNavigation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLockup />

        <nav aria-label="Primary" className="mx-auto hidden items-center gap-1 lg:flex">
          {marketingHeaderNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActivePath(currentPath, item.href) ? "page" : undefined}
              className={cn(
                navLinkClasses,
                isActivePath(currentPath, item.href) && "text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href={marketingAuthCtas.login.href}>{marketingAuthCtas.login.label}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={marketingAuthCtas.getStarted.href}>
              {marketingAuthCtas.getStarted.label}
            </Link>
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
                    {MARKETING_PRODUCT_NAME}
                  </span>
                </SheetTitle>
                <SheetDescription className="sr-only">Marketing site navigation</SheetDescription>
              </SheetHeader>

              <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-0.5">
                  {marketingHeaderNav.map((item) => (
                    <li key={item.href}>
                      <MobileNavLink
                        item={item}
                        currentPath={currentPath}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="space-y-2 border-t p-4">
                <Button variant="ghost" className="w-full" asChild>
                  <Link href={marketingAuthCtas.login.href} onClick={() => setMobileOpen(false)}>
                    {marketingAuthCtas.login.label}
                  </Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link
                    href={marketingAuthCtas.getStarted.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    {marketingAuthCtas.getStarted.label}
                  </Link>
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
  item: MarketingNavLink;
  currentPath: string;
  onNavigate: () => void;
}) {
  const active = isActivePath(currentPath, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/10 text-primary",
      )}
    >
      {item.label}
    </Link>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <BrandLockup />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              AI receptionists that answer inbound calls for your business.
            </p>
          </div>

          {marketingFooterGroups.map((group) => (
            <nav key={group.title} aria-label={`Footer — ${group.title}`}>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((item) => (
                  <li key={`${group.title}-${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <span className="font-display text-sm font-semibold tracking-tight">
            {MARKETING_PRODUCT_NAME}
          </span>
          <p className="text-xs text-muted-foreground">
              © {year} {MARKETING_PRODUCT_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
