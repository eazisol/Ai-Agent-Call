import {
  Activity,
  AudioLines,
  BookOpen,
  Bot,
  Building2,
  CreditCard,
  Flag,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Package,
  Percent,
  Phone,
  PhoneForwarded,
  Plug,
  Repeat,
  ScrollText,
  Settings,
  Store,
  TrendingUp,
  TriangleAlert,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  Webhook,
  Wrench,
} from "lucide-react";

import type {
  PortalNotification,
  PortalUser,
  SearchResultGroup,
  ShellNavGroup,
} from "./portal-shell";

/**
 * Temporary Internal Admin Portal shell/chrome fixtures ONLY.
 *
 * Used for admin navigation, user menu, notifications, and search palette.
 * These are NOT authenticated data and do NOT drive NestJS APIs.
 * Replace during Auth / Admin / Organizations / Billing vertical slices.
 *
 * Never import this file into Customer Portal Calls pages or `src/lib/api.ts`.
 */

export const adminUser: PortalUser = {
  name: "Sam Rivera",
  email: "sam@eaziaicall.com",
  role: "Platform Admin",
  initials: "SR",
};

export const adminNavGroups: ShellNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { id: "overview", label: "Overview", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: "organizations", label: "Organizations", href: "/admin/organizations", icon: Building2 },
      { id: "businesses", label: "Businesses", href: "/admin/businesses", icon: Store },
      { id: "users", label: "Users", href: "/admin/users", icon: Users },
      { id: "team-members", label: "Team Members", href: "/admin/team-members", icon: UsersRound },
    ],
  },
  {
    id: "ai-calling",
    label: "AI & Calling",
    collapsible: true,
    items: [
      { id: "agents", label: "Agents", href: "/admin/agents", icon: Bot },
      { id: "voices", label: "Voices", href: "/admin/voices", icon: AudioLines },
      { id: "knowledge", label: "Knowledge", href: "/admin/knowledge", icon: BookOpen },
      {
        id: "phone-numbers",
        label: "Phone Numbers",
        href: "/admin/phone-numbers",
        icon: PhoneForwarded,
      },
      { id: "calls", label: "Calls", href: "/admin/calls", icon: Phone },
      { id: "escalations", label: "Escalations", href: "/admin/escalations", icon: TriangleAlert },
    ],
  },
  {
    id: "providers",
    label: "Providers",
    collapsible: true,
    items: [{ id: "providers", label: "Providers", href: "/admin/providers", icon: Plug }],
  },
  {
    id: "commercial",
    label: "Commercial",
    collapsible: true,
    items: [
      { id: "plans", label: "Plans", href: "/admin/plans", icon: Package },
      { id: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions", icon: Repeat },
      { id: "usage", label: "Usage", href: "/admin/usage", icon: Gauge },
      { id: "billing", label: "Billing", href: "/admin/billing", icon: CreditCard },
      { id: "revenue", label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
      { id: "provider-costs", label: "Provider Costs", href: "/admin/provider-costs", icon: Wallet },
      { id: "margin", label: "Margin", href: "/admin/margin", icon: Percent },
    ],
  },
  {
    id: "system",
    label: "System",
    collapsible: true,
    items: [
      { id: "system-health", label: "System Health", href: "/admin/system-health", icon: Activity },
      {
        id: "webhook-failures",
        label: "Webhook Failures",
        href: "/admin/webhook-failures",
        icon: Webhook,
      },
      { id: "queues-jobs", label: "Queues & Jobs", href: "/admin/queues-jobs", icon: ListTodo },
      { id: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
      { id: "feature-flags", label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
      { id: "support-tools", label: "Support Tools", href: "/admin/support-tools", icon: Wrench },
    ],
  },
];

export const adminBottomNav: ShellNavGroup = {
  id: "admin-account",
  items: [
    { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
    { id: "docs", label: "Documentation", href: "/admin/docs", icon: LifeBuoy },
  ],
};

export const adminNotifications: PortalNotification[] = [
  {
    id: "an1",
    title: "Webhook delivery failing",
    description: "Twilio voice webhooks · 12 failures",
    time: "5 min ago",
    unread: true,
    icon: Webhook,
    tone: "warning",
  },
  {
    id: "an2",
    title: "Escalation spike",
    description: "6 escalations in the last hour",
    time: "22 min ago",
    unread: true,
    icon: TriangleAlert,
    tone: "warning",
  },
  {
    id: "an3",
    title: "New organization registered",
    description: "Nova Hospitality · Scale trial",
    time: "1 hr ago",
    unread: false,
    icon: Building2,
    tone: "info",
  },
];

export const adminSearchResults: SearchResultGroup[] = [
  {
    label: "Organizations",
    items: [
      {
        label: "Acme Healthcare",
        detail: "Organization · Scale · 4 businesses",
        href: "/admin/organizations",
        icon: Building2,
      },
    ],
  },
  {
    label: "Businesses",
    items: [
      {
        label: "Bella Cucina",
        detail: "Business · Restaurant · 2 agents",
        href: "/admin/businesses",
        icon: Store,
      },
    ],
  },
  {
    label: "Users",
    items: [
      {
        label: "alex@example.com",
        detail: "User · Owner · Eazi Demo Group",
        href: "/admin/users",
        icon: UserRound,
      },
    ],
  },
  {
    label: "Agents",
    items: [
      {
        label: "Aria — Front Desk",
        detail: "Agent · Bella Cucina · Live",
        href: "/admin/agents",
        icon: Bot,
      },
    ],
  },
  {
    label: "Calls",
    items: [
      {
        label: "+1 (415) 555-0132",
        detail: "Call · Booked · 3:42 · rec_9f2c",
        href: "/admin/calls",
        icon: Phone,
      },
    ],
  },
  {
    label: "Providers",
    items: [
      {
        label: "eleven_v2_8841",
        detail: "ElevenLabs voice ID",
        href: "/admin/providers",
        icon: Plug,
      },
      {
        label: "twilio_pn_5520",
        detail: "Twilio phone number SID",
        href: "/admin/providers",
        icon: Plug,
      },
    ],
  },
];
