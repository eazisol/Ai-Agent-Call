import { FaqList, MarketingSection } from "@/components/marketing/marketing-ui";
import { marketingFaq } from "@/content/marketing";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";

export const metadata = buildMarketingPageMetadata("/faq");

export default function FaqPage() {
  return (
    <MarketingSection
      eyebrow="FAQ"
      title="Frequently asked questions"
      description="Answers that reflect current product capabilities."
    >
      <FaqList items={marketingFaq} />
    </MarketingSection>
  );
}
