import Link from "next/link";

import { MarketingSection } from "@/components/marketing/marketing-ui";
import { Button } from "@/components/ui/button";
import { marketingLegalPlaceholder } from "@/content/marketing";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";

export const metadata = buildMarketingPageMetadata("/privacy");

export default function PrivacyPage() {
  return (
    <MarketingSection eyebrow="Legal" title={marketingLegalPlaceholder.privacyTitle}>
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed bg-card p-8 shadow-xs">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {marketingLegalPlaceholder.notice}
        </p>
        <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
          Status: {marketingLegalPlaceholder.status.privacy}
        </p>
        <div className="mt-8">
          <Button variant="outline" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
        </div>
      </div>
    </MarketingSection>
  );
}
