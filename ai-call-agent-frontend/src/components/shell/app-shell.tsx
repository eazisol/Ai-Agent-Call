"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopHeader } from "./top-header";
import type { Crumb } from "./breadcrumbs";

/**
 * AppShell — Customer Portal authenticated layout.
 *
 * Composition: collapsible sidebar (desktop 256px → 68px icon rail,
 * off-canvas drawer on mobile) + sticky top header + main content.
 *
 * Default open: desktop (>1024) expanded; tablet (768–1024) collapsed
 * when no cookie; cookie restores preferred state after hydration.
 */
export interface AppShellProps {
  breadcrumbs: Crumb[];
  children: React.ReactNode;
  contentClassName?: string;
}

export function AppShell({ breadcrumbs, children, contentClassName }: AppShellProps) {
  // Default expanded for SSR; after mount restore cookie or tablet-collapsed default.
  // Deferred update avoids hydration mismatch (cookie/viewport are client-only).
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
      <AppSidebar />
      <SidebarInset>
        <TopHeader breadcrumbs={breadcrumbs} />
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
