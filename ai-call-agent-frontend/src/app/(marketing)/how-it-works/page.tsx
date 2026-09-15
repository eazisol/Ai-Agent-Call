import { CtaPair, MarketingSection } from "@/components/marketing/marketing-ui";
import { marketingAuthCtas, marketingHowItWorks } from "@/content/marketing";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";

export const metadata = buildMarketingPageMetadata("/how-it-works");

export default function HowItWorksPage() {
  return (
    <>
      <MarketingSection
        eyebrow="How it works"
        title="Six steps to inbound AI reception"
        description="Aligned with the product workflow—not appointment or CRM add-ons."
      >
        <ol className="mx-auto max-w-3xl space-y-4">
          {marketingHowItWorks.map((step) => (
            <li key={step.step} className="rounded-xl border bg-card p-5 shadow-xs sm:flex sm:gap-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-semibold text-primary">
                {step.step}
              </span>
              <div className="mt-3 sm:mt-0">
                <h2 className="font-display text-lg font-semibold tracking-tight">{step.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </MarketingSection>
      <MarketingSection>
        <div className="rounded-2xl border bg-card px-6 py-10 text-center shadow-xs">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Ready to configure yours?</h2>
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
