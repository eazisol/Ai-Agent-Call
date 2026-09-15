import {
  MARKETING_FORBIDDEN_HREFS,
  MARKETING_LAUNCH_PATHS,
} from "@/content/marketing";

const AUTH_HREFS = ["/login", "/register"] as const;

/** True when marketing shell may navigate to this href. */
export function isEnabledMarketingRoute(href: string): boolean {
  if ((MARKETING_FORBIDDEN_HREFS as readonly string[]).includes(href)) {
    return false;
  }
  if ((AUTH_HREFS as readonly string[]).includes(href)) {
    return true;
  }
  return (MARKETING_LAUNCH_PATHS as readonly string[]).includes(href);
}