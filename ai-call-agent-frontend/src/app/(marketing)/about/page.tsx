import { CtaPair, MarketingSection } from "@/components/marketing/marketing-ui";
import {
  MARKETING_PRODUCT_NAME,
  marketingAboutBlurb,
  marketingAuthCtas,
  marketingFinalCta,
} from "@/content/marketing";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";

export const metadata = buildMarketingPageMetadata("/about");

export default function AboutPage() {
  return (
    <>
      <MarketingSection
        eyebrow="About"
        title={`What ${MARKETING_PRODUCT_NAME} is`}
        description={marketingAboutBlurb}
      >
        <div className="mx-auto grid max-w-3xl gap-4">
          <article className="rounded-xl border bg-card p-6 shadow-xs">
            <h2 className="font-display text-lg font-semibold tracking-tight">Product mission</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Help businesses answer inbound calls with configurable AI receptionists grounded in
              their own knowledge, voice preferences, and phone numbers.
            </p>
          </article>
          <article className="rounded-xl border bg-card p-6 shadow-xs">
            <h2 className="font-display text-lg font-semibold tracking-tight">Approach</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Multi-tenant workspaces, role-aware teams, and provider-backed conversational voice—
              without inventing unsupported industry modules or unverifiable claims.
            </p>
          </article>
          <article className="rounded-xl border bg-card p-6 shadow-xs">
            <h2 className="font-display text-lg font-semibold tracking-tight">Platform principles</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Server-side entitlement foundations, truthful marketing, and a clear path from setup
              to inbound conversations.
            </p>
          </article>
        </div>
      </MarketingSection>
      <MarketingSection>
        <div className="rounded-2xl border bg-card px-6 py-10 text-center shadow-xs">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {marketingFinalCta.title}
          </h2>
          <CtaPair
            className="mt-6 justify-center"
            primary={marketingAuthCtas.getStarted}
            secondary={{ label: "Contact", href: "/contact" }}
          />
        </div>
      </MarketingSection>
    </>
  );
}
