/**
 * Canonical marketing content & config for Commercial Gate P1.
 * Layout/components (P1.03) consume this — do not scatter launch copy.
 *
 * Content-truth rules: no invented pricing, social proof, stats, compliance,
 * or unavailable modules (outbound, CRM, booking, analytics, Stripe, etc.).
 */

export const MARKETING_PRODUCT_NAME = "EaziAICall" as const;

/** Accurate short product proposition (public). */
export const MARKETING_SHORT_DESCRIPTION =
  "AI receptionist platform that helps businesses answer incoming calls with configurable agents, business knowledge, voice, and managed phone numbers." as const;

export type MarketingHref =
  | "/"
  | "/features"
  | "/how-it-works"
  | "/solutions"
  | "/pricing"
  | "/about"
  | "/contact"
  | "/faq"
  | "/privacy"
  | "/terms"
  | "/login"
  | "/register";

export type MarketingNavLink = {
  label: string;
  href: MarketingHref;
};

export type MarketingCta = {
  label: string;
  href: MarketingHref;
};

/** Launch IA routes (P1.03 implements pages). */
export const MARKETING_LAUNCH_PATHS = [
  "/",
  "/features",
  "/how-it-works",
  "/solutions",
  "/pricing",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
] as const satisfies readonly MarketingHref[];

export type MarketingLaunchPath = (typeof MARKETING_LAUNCH_PATHS)[number];

/**
 * Sitemap inclusion flips to true when the corresponding page ships (P1.03).
 * Until then, do not advertise 404 URLs.
 */
export const MARKETING_SITEMAP_READY: Record<MarketingLaunchPath, boolean> = {
  "/": true,
  "/features": true,
  "/how-it-works": true,
  "/solutions": true,
  "/pricing": true,
  "/about": true,
  "/contact": true,
  "/faq": true,
  "/privacy": true,
  "/terms": true,
};

export const marketingHeaderNav: MarketingNavLink[] = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

export const marketingAuthCtas = {
  login: { label: "Log in", href: "/login" } satisfies MarketingCta,
  getStarted: { label: "Get Started", href: "/register" } satisfies MarketingCta,
} as const;

export const marketingHero = {
  eyebrow: "AI receptionist for businesses",
  h1: "Answer every business call with an AI receptionist",
  supporting:
    "Configure an AI agent with your business knowledge and voice, connect a phone number, and handle incoming calls—without inventing workflows you do not have yet.",
  primaryCta: {
    label: "Get Started",
    href: "/register",
  } satisfies MarketingCta,
  secondaryCta: {
    label: "Contact us",
    href: "/contact",
  } satisfies MarketingCta,
} as const;

export type MarketingFeatureStatus = "available";

export type MarketingFeature = {
  id: string;
  title: string;
  description: string;
  iconKey:
    | "bot"
    | "book"
    | "mic"
    | "audio-waveform"
    | "phone"
    | "phone-incoming"
    | "building"
    | "users"
    | "message-square";
  status: MarketingFeatureStatus;
  anchor?: string;
};

/**
 * Public feature registry — launch-available capabilities only.
 * Internal module IDs are not exposed to visitors.
 */
export const marketingFeatures: MarketingFeature[] = [
  {
    id: "ai-agents",
    title: "AI Receptionist Agents",
    description:
      "Create configurable AI receptionists with greetings and instructions tailored to each business.",
    iconKey: "bot",
    status: "available",
    anchor: "ai-agents",
  },
  {
    id: "knowledge",
    title: "Business Knowledge",
    description:
      "Add the information your receptionist should use when answering common caller questions.",
    iconKey: "book",
    status: "available",
    anchor: "knowledge",
  },
  {
    id: "voice-library",
    title: "Voice Library",
    description:
      "Choose from available voices so callers hear a natural, conversational tone.",
    iconKey: "mic",
    status: "available",
    anchor: "voice-library",
  },
  {
    id: "voice-cloning",
    title: "Voice Cloning",
    description:
      "Where your plan includes it, create a custom cloned voice for a more familiar brand presence.",
    iconKey: "audio-waveform",
    status: "available",
    anchor: "voice-cloning",
  },
  {
    id: "phone-numbers",
    title: "Phone Numbers",
    description:
      "Search, purchase or import numbers and assign them to the right agent for your business.",
    iconKey: "phone",
    status: "available",
    anchor: "phone-numbers",
  },
  {
    id: "incoming-calls",
    title: "Incoming AI Calls",
    description:
      "Configure an AI receptionist to answer incoming business calls using your agent setup.",
    iconKey: "phone-incoming",
    status: "available",
    anchor: "incoming-calls",
  },
  {
    id: "workspaces",
    title: "Business & Workspace Management",
    description:
      "Organize one or more businesses under your organization with clear ownership.",
    iconKey: "building",
    status: "available",
    anchor: "workspaces",
  },
  {
    id: "team-roles",
    title: "Team & Roles",
    description:
      "Invite teammates and control access with owner, admin, manager, and viewer roles.",
    iconKey: "users",
    status: "available",
    anchor: "team-roles",
  },
  {
    id: "greeting-instructions",
    title: "Configurable Greeting & Instructions",
    description:
      "Shape how the receptionist opens calls and what guidance it follows during conversations.",
    iconKey: "message-square",
    status: "available",
    anchor: "greeting-instructions",
  },
];

/** Capabilities excluded from launch marketing (do not present as available). */
export const marketingExcludedCapabilities = [
  "Outbound calls",
  "Appointment booking",
  "Restaurant reservations",
  "CRM",
  "Automation workflows",
  "Product notifications center",
  "Analytics dashboards",
  "Usage metering",
  "Stripe billing / checkout",
  "Deep industry booking integrations",
] as const;

export type MarketingHowItWorksStep = {
  step: number;
  title: string;
  description: string;
};

export const marketingHowItWorks: MarketingHowItWorksStep[] = [
  {
    step: 1,
    title: "Create your business workspace",
    description: "Set up the business your AI receptionist will represent.",
  },
  {
    step: 2,
    title: "Configure your AI receptionist",
    description: "Define greetings and instructions for how calls should be handled.",
  },
  {
    step: 3,
    title: "Add business knowledge",
    description: "Provide the facts and FAQs callers are likely to ask about.",
  },
  {
    step: 4,
    title: "Choose a voice",
    description: "Select a library voice—or a cloned voice when your plan includes it.",
  },
  {
    step: 5,
    title: "Connect a phone number",
    description: "Assign a managed number so callers reach the right agent.",
  },
  {
    step: 6,
    title: "Receive incoming calls",
    description: "Your AI receptionist answers inbound calls using that configuration.",
  },
];

export type MarketingSolution = {
  id: string;
  title: string;
  description: string;
};

/** Use-case positioning only — not deep industry product modules. */
export const marketingSolutions: MarketingSolution[] = [
  {
    id: "professional-services",
    title: "Professional Services",
    description:
      "Answer after-hours and overflow calls, share business information, and capture conversational context for follow-up.",
  },
  {
    id: "clinics",
    title: "Clinics & Practices",
    description:
      "Handle common caller questions with practice knowledge while keeping humans in control of clinical decisions.",
  },
  {
    id: "home-services",
    title: "Home Services",
    description:
      "Stay reachable when crews are on the job—answer inquiries and share service details consistently.",
  },
  {
    id: "salons",
    title: "Beauty & Salons",
    description:
      "Greet callers, answer frequently asked questions, and present your business information clearly.",
  },
  {
    id: "real-estate",
    title: "Real Estate",
    description:
      "Respond to inbound inquiries with listing or office information from your configured knowledge.",
  },
  {
    id: "restaurants",
    title: "Restaurants",
    description:
      "Answer common questions about hours, location, and menu information you provide—without implying a built-in reservations product.",
  },
];

export type MarketingFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const marketingFaq: MarketingFaqItem[] = [
  {
    id: "what-is",
    question: "What is EaziAICall?",
    answer:
      "EaziAICall is an AI receptionist platform for businesses. You configure agents, knowledge, voice, and phone numbers so inbound callers can be answered consistently.",
  },
  {
    id: "how-answers",
    question: "How does the AI receptionist answer calls?",
    answer:
      "After you configure an agent, connect knowledge and voice, and assign a phone number, inbound calls can be handled by that AI receptionist setup.",
  },
  {
    id: "customize",
    question: "Can I customize the agent?",
    answer:
      "Yes. You can set greetings and instructions so the receptionist follows your preferred call handling guidance.",
  },
  {
    id: "knowledge",
    question: "Can I add my own business knowledge?",
    answer:
      "Yes. You can add business knowledge sources so the receptionist can draw on information you provide when answering questions.",
  },
  {
    id: "voice",
    question: "Can I choose a voice?",
    answer:
      "Yes. You can select from the voice library available in the product.",
  },
  {
    id: "clone",
    question: "Can I use a custom cloned voice?",
    answer:
      "Voice cloning is available when included in your subscription plan. Plans and entitlements determine whether cloning is enabled for your organization.",
  },
  {
    id: "numbers",
    question: "How do phone numbers work?",
    answer:
      "You can search, purchase, or import numbers through the product and assign them to agents for your businesses.",
  },
  {
    id: "multi-business",
    question: "Can I manage multiple businesses?",
    answer:
      "Yes. Organizations can manage multiple business workspaces, subject to your plan limits when enforcement is enabled.",
  },
  {
    id: "pricing",
    question: "Is pricing available?",
    answer:
      "Public plans are loaded from our live plan catalog when commercial plans are published. If no plans are listed yet, you can still get started or contact us for launch access—we do not invent placeholder tiers.",
  },
  {
    id: "get-started",
    question: "How do I get started?",
    answer:
      "Create an account to set up your organization and business, then configure your AI receptionist. Use Log in if you already have an account.",
  },
];

export type MarketingFooterGroup = {
  title: string;
  links: MarketingNavLink[];
};

export const marketingFooterGroups: MarketingFooterGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [{ label: "Solutions", href: "/solutions" }],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [{ label: "FAQ", href: "/faq" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export const marketingValueStrip = [
  {
    id: "always-on",
    title: "Answer when you cannot",
    description: "Keep a consistent receptionist experience for inbound callers.",
  },
  {
    id: "knowledge",
    title: "Grounded in your business",
    description: "Use knowledge you configure—not invented facts.",
  },
  {
    id: "voice",
    title: "Natural conversational voice",
    description: "Provider-backed voice so callers hear a clear, natural tone.",
  },
  {
    id: "numbers",
    title: "Managed phone numbers",
    description: "Connect numbers to the agents that should answer them.",
  },
] as const;

export const marketingBusinessOutcomes = [
  {
    id: "consistency",
    title: "Consistent first impressions",
    description:
      "Give every inbound caller the same clear greeting and guidance you configure.",
  },
  {
    id: "coverage",
    title: "Coverage beyond office hours",
    description:
      "Keep answering common questions when your team is unavailable to pick up.",
  },
  {
    id: "multi-business",
    title: "Ready for multiple businesses",
    description:
      "Organize workspaces under one organization as you grow—subject to your plan.",
  },
] as const;

export const marketingFinalCta = {
  title: "Start with EaziAICall",
  supporting:
    "Create your account, configure your AI receptionist, and connect a number when you are ready.",
  primaryCta: marketingAuthCtas.getStarted,
  secondaryCta: {
    label: "Contact us",
    href: "/contact",
  } satisfies MarketingCta,
} as const;

export const marketingAboutBlurb =
  "EaziAICall helps businesses run AI receptionists for incoming calls—configure agents, knowledge, voice, and phone numbers in one multi-tenant workspace." as const;

/**
 * PUBLIC CONTACT EMAIL = DECISION REQUIRED
 * No approved public support address is configured in repo env/docs.
 */
export const marketingPublicContactEmail: string | null = null;

/**
 * LEGAL COPY = DECISION REQUIRED
 * Do not invent Privacy/Terms. P1.03 may show a non-final shell only after approval.
 */
export const marketingLegalCopyStatus = {
  privacy: "LEGAL_COPY_REQUIRED",
  terms: "LEGAL_COPY_REQUIRED",
} as const;

/** OG IMAGE = OPTIONAL until a dedicated social preview asset exists. */
export const marketingOgImageStatus = "OG_IMAGE_OPTIONAL" as const;

/**
 * Contact/demo transport for P1.03.
 * No CRM/contact backend — page can still offer Get Started + optional mailto when email is set.
 */
export const marketingContactPage = {
  title: "Contact",
  intro:
    "Create an account to get started, or check back here when direct contact details are published.",
  pendingNotice:
    "Direct contact details will be available shortly.",
  getStarted: marketingAuthCtas.getStarted,
  login: marketingAuthCtas.login,
} as const;

export const marketingContactStrategy = {
  mode: "page_with_auth_cta" as const,
  getStartedHref: "/register" as const,
  mailto: null as string | null,
  decisionRequired: [
    "PUBLIC CONTACT EMAIL",
    "Optional lightweight contact form / mail endpoint",
  ] as const,
};

export const marketingLegalPlaceholder = {
  privacyTitle: "Privacy",
  termsTitle: "Terms",
  notice:
    "Counsel-approved legal copy is required before this page becomes an official policy. This route is a launch placeholder only and is not legal advice.",
  status: marketingLegalCopyStatus,
} as const;

/** Dead routes that must never appear in canonical marketing config. */
export const MARKETING_FORBIDDEN_HREFS = [
  "/book-demo",
  "/start-free-trial",
] as const;

/** Private app surfaces — robots should discourage indexing. */
export const MARKETING_ROBOTS_DISALLOW = [
  "/dashboard",
  "/calls",
  "/agents",
  "/businesses",
  "/knowledge",
  "/voices",
  "/phone-numbers",
  "/team",
  "/settings",
  "/billing",
  "/onboarding",
  "/admin",
  "/invitations",
  "/api/",
] as const;

export type MarketingRouteMeta = {
  path: MarketingLaunchPath;
  title: string;
  description: string;
  canonicalPath: MarketingLaunchPath;
};

/**
 * Per-route SEO foundation for P1.03 pages.
 */
export const marketingRouteMetadata: Record<
  MarketingLaunchPath,
  MarketingRouteMeta
> = {
  "/": {
    path: "/",
    title: "AI Receptionist for Business Calls",
    description: MARKETING_SHORT_DESCRIPTION,
    canonicalPath: "/",
  },
  "/features": {
    path: "/features",
    title: "Features",
    description:
      "Explore AI receptionist agents, knowledge, voice, phone numbers, team roles, and inbound call handling in EaziAICall.",
    canonicalPath: "/features",
  },
  "/how-it-works": {
    path: "/how-it-works",
    title: "How It Works",
    description:
      "See how to create a business workspace, configure an AI receptionist, add knowledge, choose a voice, connect a number, and receive calls.",
    canonicalPath: "/how-it-works",
  },
  "/solutions": {
    path: "/solutions",
    title: "Solutions",
    description:
      "Use-case ideas for professional services, clinics, home services, salons, real estate, and restaurants—focused on answering calls and sharing business information.",
    canonicalPath: "/solutions",
  },
  "/pricing": {
    path: "/pricing",
    title: "Pricing",
    description:
      "View live EaziAICall plans from our public catalog when available, or get started while commercial plans are being finalized.",
    canonicalPath: "/pricing",
  },
  "/about": {
    path: "/about",
    title: "About",
    description:
      "Learn about EaziAICall, the AI receptionist platform for multi-tenant business call handling.",
    canonicalPath: "/about",
  },
  "/contact": {
    path: "/contact",
    title: "Contact",
    description:
      "Contact EaziAICall or create an account to get started with your AI receptionist workspace.",
    canonicalPath: "/contact",
  },
  "/faq": {
    path: "/faq",
    title: "FAQ",
    description:
      "Answers about AI receptionists, knowledge, voices, phone numbers, plans, and getting started with EaziAICall.",
    canonicalPath: "/faq",
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy",
    description:
      "EaziAICall privacy information. Counsel-approved policy text is required before this page is final.",
    canonicalPath: "/privacy",
  },
  "/terms": {
    path: "/terms",
    title: "Terms",
    description:
      "EaziAICall terms information. Counsel-approved legal text is required before this page is final.",
    canonicalPath: "/terms",
  },
};

export function collectMarketingHrefs(): string[] {
  const hrefs = new Set<string>();
  for (const link of marketingHeaderNav) hrefs.add(link.href);
  hrefs.add(marketingAuthCtas.login.href);
  hrefs.add(marketingAuthCtas.getStarted.href);
  hrefs.add(marketingHero.primaryCta.href);
  hrefs.add(marketingHero.secondaryCta.href);
  hrefs.add(marketingFinalCta.primaryCta.href);
  hrefs.add(marketingFinalCta.secondaryCta.href);
  for (const group of marketingFooterGroups) {
    for (const link of group.links) hrefs.add(link.href);
  }
  return [...hrefs];
}

export function getSitemapReadyPaths(): MarketingLaunchPath[] {
  return MARKETING_LAUNCH_PATHS.filter((path) => MARKETING_SITEMAP_READY[path]);
}
