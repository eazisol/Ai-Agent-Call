import {
  AudioLines,
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  Phone,
  PhoneForwarded,
  RefreshCw,
  Settings,
  UserPlus,
  Users,
  UsersRound,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Temporary Customer Portal shell/chrome fixtures ONLY.
 *
 * Used for organization/business switchers, nav labels, notifications,
 * search palette, usage indicator, and user menu display.
 *
 * These are NOT authenticated data and do NOT drive Calls or any NestJS
 * API. They will be replaced by real vertical-slice APIs
 * (Organizations, Businesses, Auth, Billing, etc.) in later modules.
 *
 * Never import this file into Calls pages or `src/lib/api.ts`.
 */

export interface PortalOrganization {
  id: string;
  name: string;
  plan: string;
}

export const organizations: PortalOrganization[] = [
  { id: "org_eazi", name: "Eazi Demo Group", plan: "Growth" },
  { id: "org_acme", name: "Acme Healthcare", plan: "Scale" },
  { id: "org_nova", name: "Nova Hospitality", plan: "Starter" },
];

export const currentOrganizationId = "org_eazi";

export interface PortalBusiness {
  id: string;
  name: string;
  industry: string;
}

/** "all" = cross-business context (Dashboard, Analytics). */
export const allBusinessesId = "all";

export const businesses: PortalBusiness[] = [
  { id: "biz_bella", name: "Bella Cucina", industry: "Restaurant" },
  { id: "biz_harbor", name: "Harbor Dental", industry: "Dental clinic" },
  { id: "biz_glow", name: "Glow Studio", industry: "Salon & spa" },
  { id: "biz_summit", name: "Summit Legal", industry: "Law firm" },
];

export const currentBusinessId = allBusinessesId;

export interface PortalUser {
  name: string;
  email: string;
  role: string;
  initials: string;
}

export const currentUser: PortalUser = {
  name: "Alex Morgan",
  email: "alex@example.com",
  role: "Owner",
  initials: "AM",
};

export interface UsageSummary {
  label: string;
  used: number;
  limit: number;
  href: string;
}

export const usageSummary: UsageSummary = {
  label: "Monthly minutes",
  used: 1820,
  limit: 2500,
  href: "/billing",
};

export interface ShellNavChild {
  label: string;
  href: string;
}

export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  children?: ShellNavChild[];
}

export interface ShellNavGroup {
  id: string;
  /** Omit for unlabeled groups (e.g. sidebar footer). */
  label?: string;
  items: ShellNavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/** Production-enabled routes in Phase 3: /dashboard, /calls, /settings. */
export const portalNavGroups: ShellNavGroup[] = [
  {
    id: "main",
    label: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { id: "agents", label: "AI Agents", href: "/agents", icon: Bot },
      { id: "calls", label: "Calls", href: "/calls", icon: Phone },
      { id: "customers", label: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      {
        id: "bookings",
        label: "Bookings",
        href: "/bookings",
        icon: CalendarCheck,
        children: [
          { label: "Appointments", href: "/bookings/appointments" },
          { label: "Reservations", href: "/bookings/reservations" },
        ],
      },
      { id: "knowledge", label: "Knowledge", href: "/knowledge", icon: BookOpen },
      {
        id: "voice",
        label: "Voice & Numbers",
        href: "/voice",
        icon: AudioLines,
        children: [
          { label: "Voices", href: "/voice/voices" },
          { label: "Phone Numbers", href: "/voice/numbers" },
        ],
      },
    ],
  },
  {
    id: "workflows",
    label: "Workflows",
    items: [
      {
        id: "automations",
        label: "Automations",
        href: "/automations",
        icon: Workflow,
        children: [
          { label: "Automations", href: "/automations/flows" },
          { label: "Tools", href: "/automations/tools" },
          { label: "Integrations", href: "/automations/integrations" },
        ],
      },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

export const portalBottomNav: ShellNavGroup = {
  id: "account",
  items: [
    { id: "team", label: "Team", href: "/team", icon: UsersRound },
    { id: "billing", label: "Billing", href: "/billing", icon: CreditCard },
    { id: "settings", label: "Settings", href: "/settings", icon: Settings },
    { id: "help", label: "Help & Documentation", href: "/help", icon: LifeBuoy },
  ],
};

export const bookingChildIcons = { appointments: CalendarDays, reservations: CalendarClock };
export const voiceChildIcons = { numbers: PhoneForwarded };
export const automationToolIcon = Wrench;

export interface PortalNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  icon: LucideIcon;
  tone: "info" | "success" | "warning";
}

export const notifications: PortalNotification[] = [
  {
    id: "n1",
    title: "New qualified lead",
    description: "Bella Cucina",
    time: "2 min ago",
    unread: true,
    icon: UserPlus,
    tone: "info",
  },
  {
    id: "n2",
    title: "Knowledge sync completed",
    description: "Harbor Dental",
    time: "18 min ago",
    unread: true,
    icon: RefreshCw,
    tone: "success",
  },
  {
    id: "n3",
    title: "Usage nearing limit",
    description: "86% of monthly minutes used",
    time: "1 hr ago",
    unread: false,
    icon: Gauge,
    tone: "warning",
  },
];

export interface SearchResultItem {
  label: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}

export interface SearchResultGroup {
  label: string;
  items: SearchResultItem[];
}

export const searchResults: SearchResultGroup[] = [
  {
    label: "Calls",
    items: [
      {
        label: "+1 (415) 555-0132",
        detail: "Bella Cucina · Booked · 3:42",
        href: "/calls",
        icon: Phone,
      },
      {
        label: "+44 20 7946 0958",
        detail: "Harbor Dental · Escalated · 5:07",
        href: "/calls",
        icon: Phone,
      },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        label: "Marco Reyes",
        detail: "Bella Cucina · 6 visits",
        href: "/customers",
        icon: Users,
      },
    ],
  },
  {
    label: "Agents",
    items: [
      {
        label: "Aria — Front Desk",
        detail: "Bella Cucina · Live",
        href: "/agents",
        icon: Bot,
      },
      {
        label: "Noah — Reception",
        detail: "Harbor Dental · Live",
        href: "/agents",
        icon: Bot,
      },
    ],
  },
  {
    label: "Businesses",
    items: [
      {
        label: "Glow Studio",
        detail: "Salon & spa · 1 agent",
        href: "/businesses",
        icon: Blocks,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Business hours",
        detail: "Settings · Business profile",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
