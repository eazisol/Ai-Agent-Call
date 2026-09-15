import Link from "next/link";

import { FeatureCards, MarketingSection } from "@/components/marketing/marketing-ui";
import { Button } from "@/components/ui/button";
import { marketingAuthCtas, marketingFeatures } from "@/content/marketing";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";

export const metadata = buildMarketingPageMetadata("/features");

export default function FeaturesPage() {
  return (
    <MarketingSection
      eyebrow="Features"
      title="What you can configure today"
      description="Public feature summaries mapped to shipping product capabilities."
    >
      <FeatureCards features={marketingFeatures} />
      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={marketingAuthCtas.getStarted.href}>
            {marketingAuthCtas.getStarted.label}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/how-it-works">How it works</Link>
        </Button>
      </div>
    </MarketingSection>
  );
}
