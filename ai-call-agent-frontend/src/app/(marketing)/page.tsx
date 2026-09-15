import { MarketingHomePage } from "@/components/marketing/home-page";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";
import { fetchPublicPlans } from "@/lib/public-plans";

export const metadata = buildMarketingPageMetadata("/");

export default async function MarketingHomeRoute() {
  const plans = await fetchPublicPlans();
  return <MarketingHomePage plans={plans} />;
}
