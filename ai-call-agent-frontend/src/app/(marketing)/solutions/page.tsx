import { CtaPair, MarketingSection } from "@/components/marketing/marketing-ui";
import { marketingAuthCtas, marketingSolutions } from "@/content/marketing";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";

export const metadata = buildMarketingPageMetadata("/solutions");

export default function SolutionsPage() {
  return (
    <>
      <MarketingSection
        eyebrow="Solutions"
        title="Inbound reception use cases"
        description="Industry examples for answering calls and sharing business information—not deep booking or CRM modules."
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marketingSolutions.map((item) => (
            <li key={item.id} className="rounded-xl border bg-card p-6 shadow-xs">
              <h2 className="font-display text-xl font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </MarketingSection>
      <MarketingSection>
        <div className="rounded-2xl border bg-card px-6 py-10 text-center shadow-xs">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Start with your business workspace
          </h2>
          <CtaPair
            className="mt-6 justify-center"
            primary={marketingAuthCtas.getStarted}
            secondary={{ label: "See features", href: "/features" }}
          />
        </div>
      </MarketingSection>
    </>
  );
}
