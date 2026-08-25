/**
 * EaziAICall shells (framework-portable).
 *
 * Customer: AppShell via PortalShell
 * Admin: PlatformShell via AdminShell
 * Temporary chrome fixtures: src/mocks/portal-shell.ts, admin-shell.ts
 */
export { AppShell, type AppShellProps } from "./app-shell";
export { AppSidebar } from "./app-sidebar";
export {
  PlatformShell,
  type PlatformShellProps,
  type PlatformBrand,
} from "./platform-shell";
export { AdminShell } from "./admin-shell";
export { SidebarNav } from "./sidebar-nav";
export { OrganizationSwitcher } from "./organization-switcher";
export { BusinessSwitcher, type BusinessSwitcherProps } from "./business-switcher";
export { TopHeader } from "./top-header";
export { SearchTrigger, SearchPalette } from "./global-search";
export { NotificationMenu } from "./notifications-menu";
export { HelpMenu } from "./help-menu";
export { UserMenu } from "./user-menu";
export { Breadcrumbs, type Crumb } from "./breadcrumbs";
export { UsageIndicator } from "./usage-indicator";
export { PortalShell } from "./portal-shell";
export {
  ShellNavigationProvider,
  useShellNavigation,
  type ShellNavigationValue,
} from "./shell-navigation";
