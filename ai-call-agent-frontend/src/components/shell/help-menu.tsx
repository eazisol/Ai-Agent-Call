"use client";

import { CircleHelp, LifeBuoy, MessagesSquare, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toastComingSoon } from "./portal-nav";

/** HelpMenu — compact support entry points in the top header (chrome only). */
export function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help and resources">
          <CircleHelp className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => toastComingSoon()}>
          <LifeBuoy className="size-4 text-muted-foreground" aria-hidden="true" />
          Help Center
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toastComingSoon()}>
          <Rocket className="size-4 text-muted-foreground" aria-hidden="true" />
          Getting Started
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toastComingSoon()}>
          <MessagesSquare className="size-4 text-muted-foreground" aria-hidden="true" />
          Contact Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toastComingSoon()}>
          <span className="flex-1">Keyboard Shortcuts</span>
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
