/**
 * Temporary Public / Marketing Website shell fixtures ONLY.
 *
 * Navigation labels and hrefs for header/footer chrome.
 * Not wired to real marketing pages yet — host adapters toast
 * unimplemented targets. Replace during the Marketing vertical slice.
 */

export interface PublicNavLink {
  label: string;
  href: string;
}

/** Primary header links; Industries is rendered as a dropdown instead. */
export const publicNavLinks: PublicNavLink[] = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Integrations", href: "/integrations" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
];

export const industries: PublicNavLink[] = [
  { label: "Restaurants", href: "/industries/restaurants" },
  { label: "Salons", href: "/industries/salons" },
  { label: "Clinics", href: "/industries/clinics" },
  { label: "Dental", href: "/industries/dental" },
  { label: "Real Estate", href: "/industries/real-estate" },
  { label: "Law Firms", href: "/industries/law-firms" },
  { label: "Insurance", href: "/industries/insurance" },
  { label: "Landscaping", href: "/industries/landscaping" },
  { label: "Professional Services", href: "/industries/professional-services" },
  { label: "Other Industries", href: "/industries" },
];

export const publicActions = {
  login: { label: "Login", href: "/login" },
  bookDemo: { label: "Book Demo", href: "/book-demo" },
  startTrial: { label: "Start Free Trial", href: "/start-free-trial" },
} as const;

export interface PublicFooterGroup {
  title: string;
  links: PublicNavLink[];
}

export const publicFooterGroups: PublicFooterGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "AI Receptionist", href: "/features/ai-receptionist" },
    ],
  },
  {
    title: "Industries",
    links: [
      { label: "Restaurants", href: "/industries/restaurants" },
      { label: "Salons", href: "/industries/salons" },
      { label: "Clinics", href: "/industries/clinics" },
      { label: "Real Estate", href: "/industries/real-estate" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Documentation", href: "/docs" },
      { label: "Security", href: "/security" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];
