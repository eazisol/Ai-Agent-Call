"use client";

import * as React from "react";
import { CornerDownLeft, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchResults, type SearchResultGroup } from "@/mocks/portal-shell";
import { useShellNavigation } from "./shell-navigation";

/**
 * GlobalSearch — ⌘K command palette trigger + dialog.
 * Uses temporary chrome fixtures for result groups only.
 */

export interface SearchTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** "field" = full-width fake input (desktop header), "icon" = icon button (mobile). */
  variant?: "field" | "icon";
}

export function SearchTrigger({ variant = "field", className, ...props }: SearchTriggerProps) {
  if (variant === "icon") {
    return (
      <Button variant="ghost" size="icon" aria-label="Search (⌘K)" className={className} {...props}>
        <Search className="size-4" aria-hidden="true" />
      </Button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Search EaziAICall (⌘K)"
      className={cn(
        "flex h-9 w-full max-w-md items-center gap-2.5 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate text-left">Search EaziAICall…</span>
      <kbd className="pointer-events-none inline-flex h-5 shrink-0 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span aria-hidden="true">⌘</span>K
      </kbd>
    </button>
  );
}

export interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups?: SearchResultGroup[] | undefined;
  placeholder?: string | undefined;
}

export function SearchPalette({
  open,
  onOpenChange,
  groups = searchResults,
  placeholder = "Search calls, customers, agents, settings…",
}: SearchPaletteProps) {
  const { navigate } = useShellNavigation();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const pick = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search EaziAICall</DialogTitle>
        <DialogDescription className="sr-only">
          Search calls, customers, agents, businesses and settings.
        </DialogDescription>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={`${group.label}-${item.label}`}
                    value={`${item.label} ${item.detail}`}
                    onSelect={() => pick(item.href)}
                    className="gap-3"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted">
                      <item.icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="grid flex-1 leading-tight">
                      <span className="truncate text-sm">{item.label}</span>
                      <span className="truncate text-xs text-muted-foreground">{item.detail}</span>
                    </span>
                    <CornerDownLeft
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
