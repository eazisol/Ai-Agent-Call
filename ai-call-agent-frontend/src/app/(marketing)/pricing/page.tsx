import { MarketingSection } from "@/components/marketing/marketing-ui";
import { PricingPlansBlock } from "@/components/marketing/pricing-plans-block";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";
import { fetchPublicPlans } from "@/lib/public-plans";

export const metadata = buildMarketingPageMetadata("/pricing");

export default async function PricingPage() {
  const plans = await fetchPublicPlans();
  return (
    <MarketingSection
      eyebrow="Pricing"
      title="Public plans"
      description="Loaded from the live M25 public catalog. Empty catalogs are a valid launch state."
    >
      <PricingPlansBlock result={plans} />
    </MarketingSection>
  );
}
