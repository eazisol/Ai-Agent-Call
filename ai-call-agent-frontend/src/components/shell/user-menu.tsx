"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Moon, Sun, UserRound } from "lucide-react";

import { useOptionalAuthSession } from "@/components/auth/auth-session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentUser, type PortalUser } from "@/mocks/portal-shell";
import { toastComingSoon } from "./portal-nav";

/**
 * UserMenu — account menu in the top header.
 * Sign Out calls real auth logout and returns to /login.
 */
export function UserMenu({ user }: { user?: PortalUser | undefined }) {
  const router = useRouter();
  const auth = useOptionalAuthSession();
  const resolved = user ?? auth?.portalUser ?? currentUser;
  const [signingOut, setSigningOut] = React.useState(false);
  const [isDark, setIsDark] = React.useState(
    () =>
      typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("eaziaicall-theme", next ? "dark" : "light");
    } catch {
      /* ignore storage failures */
    }
  };

  const onSignOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      if (auth) {
        await auth.logout();
      }
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Account menu — ${resolved.name}`}
          className="rounded-full"
        >
          <Avatar className="size-8 border">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {resolved.initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5">
          <Avatar className="size-9 border">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {resolved.initials}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{resolved.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {resolved.role}
              </Badge>
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {resolved.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toastComingSoon("Profile details expand in a later module.")}>
          <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => toastComingSoon("Organization settings arrive with Organizations.")}
        >
          <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
          Organization Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={toggleTheme}>
          {isDark ? (
            <Sun className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Moon className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          Theme
          <span className="ml-auto text-xs text-muted-foreground">{isDark ? "Light" : "Dark"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void onSignOut();
          }}
          className="text-destructive-strong focus:text-destructive-strong"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {signingOut ? "Signing out…" : "Sign Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
