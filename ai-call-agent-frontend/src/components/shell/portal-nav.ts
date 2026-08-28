"use client";

import { toast } from "sonner";

/** Consistent toast for unimplemented portal chrome / nav targets. */
export function toastComingSoon(description = "This section is not available yet.") {
  toast.info("Coming in a future module", { description });
}

/**
 * Routes that are live in the production App Router for Phase 3.
 * Everything else stays visual-only and toasts instead of 404ing.
 */
export function isEnabledPortalRoute(href: string): boolean {
  if (
    href === "/dashboard" ||
    href === "/calls" ||
    href === "/team" ||
    href === "/businesses" ||
    href === "/businesses/new" ||
    href === "/agents" ||
    href === "/agents/new" ||
    href === "/knowledge" ||
    href === "/knowledge/new" ||
    href === "/voices" ||
    href === "/voices/clones" ||
    href === "/voices/clones/new" ||
    href === "/phone-numbers" ||
    href === "/phone-numbers/new" ||
    href === "/phone-numbers/import" ||
    href === "/settings" ||
    href === "/settings/organization" ||
    href === "/settings/integrations" ||
    href === "/onboarding/organization"
  ) {
    return true;
  }
  if (
    href.startsWith("/calls/") ||
    href.startsWith("/businesses/") ||
    href.startsWith("/agents/") ||
    href.startsWith("/knowledge/") ||
    href.startsWith("/phone-numbers") ||
    href.startsWith("/voices")
  ) {
    return true;
  }
  return false;
}

export function isNavItemActive(currentPath: string, href: string): boolean {
  if (currentPath === href) return true;
  if (href !== "/" && currentPath.startsWith(`${href}/`)) return true;
  return false;
}
