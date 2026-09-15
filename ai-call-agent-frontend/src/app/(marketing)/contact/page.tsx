import Link from "next/link";

import { MarketingSection } from "@/components/marketing/marketing-ui";
import { Button } from "@/components/ui/button";
import { marketingContactPage, marketingPublicContactEmail } from "@/content/marketing";
import { buildMarketingPageMetadata } from "@/content/marketing-seo";

export const metadata = buildMarketingPageMetadata("/contact");

export default function ContactPage() {
  return (
    <MarketingSection eyebrow="Contact" title={marketingContactPage.title} description={marketingContactPage.intro}>
      <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center shadow-xs">
        <p className="text-sm text-muted-foreground">{marketingContactPage.pendingNotice}</p>
        {marketingPublicContactEmail ? (
          <p className="mt-4 text-sm">
            <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${marketingPublicContactEmail}`}>
              {marketingPublicContactEmail}
            </a>
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={marketingContactPage.getStarted.href}>
              {marketingContactPage.getStarted.label}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={marketingContactPage.login.href}>{marketingContactPage.login.label}</Link>
          </Button>
        </div>
      </div>
    </MarketingSection>
  );
}
