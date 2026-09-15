import Link from "next/link";

import {
  CtaPair,
  FaqList,
  FeatureCards,
  MarketingSection,
  ProductWorkflowVisual,
} from "@/components/marketing/marketing-ui";
import { PricingPlansBlock } from "@/components/marketing/pricing-plans-block";
import { Button } from "@/components/ui/button";
import {
  marketingBusinessOutcomes,
  marketingFaq,
  marketingFeatures,
  marketingFinalCta,
  marketingHero,
  marketingHowItWorks,
  marketingSolutions,
  marketingValueStrip,
} from "@/content/marketing";
import type { PublicPlansResult } from "@/lib/public-plans";

export function MarketingHomePage({ plans }: { plans: PublicPlansResult }) {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.02_250),transparent_55%)]"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              {marketingHero.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {marketingHero.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              {marketingHero.supporting}
            </p>
            <CtaPair
              className="mt-8"
              primary={marketingHero.primaryCta}
              secondary={marketingHero.secondaryCta}
            />
          </div>
        </div>
      </section>

      <MarketingSection>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {marketingValueStrip.map((item) => (
            <li key={item.id} className="rounded-xl border bg-card p-5 shadow-xs">
              <h2 className="font-display text-base font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        className="bg-muted/30"
        eyebrow="How it works"
        title="From setup to inbound conversations"
        description="A straightforward path aligned with the product you can configure today."
      >
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marketingHowItWorks.map((step) => (
            <li key={step.step} className="rounded-xl border bg-card p-5 shadow-xs">
              <span className="text-xs font-medium uppercase tracking-wider text-primary">
                Step {step.step}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/how-it-works">See the full walkthrough</Link>
          </Button>
        </div>
      </MarketingSection>

      <MarketingSection
        eyebrow="Features"
        title="Built for inbound AI reception"
        description="Capabilities that reflect the shipping product—not future modules."
      >
        <FeatureCards features={marketingFeatures.slice(0, 6)} />
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/features">Explore all features</Link>
          </Button>
        </div>
      </MarketingSection>

      <MarketingSection
        className="bg-muted/30"
        eyebrow="Outcomes"
        title="What teams use it for"
        description="Practical results without invented metrics or guarantees."
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {marketingBusinessOutcomes.map((item) => (
            <li key={item.id} className="rounded-xl border bg-card p-5 shadow-xs">
              <h3 className="font-display text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        eyebrow="Solutions"
        title="Use cases across industries"
        description="Positioning for how inbound reception helps—not deep industry product claims."
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marketingSolutions.map((item) => (
            <li key={item.id} className="rounded-xl border bg-card p-5 shadow-xs">
              <h3 className="font-display text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/solutions">View solutions</Link>
          </Button>
        </div>
      </MarketingSection>

      <MarketingSection
        className="bg-muted/30"
        eyebrow="Workflow"
        title="How the pieces connect"
        description="A lightweight view of the inbound receptionist path."
      >
        <ProductWorkflowVisual />
      </MarketingSection>

      <MarketingSection
        eyebrow="Pricing"
        title="Plans from the live catalog"
        description="Public plans come from M25. Empty catalogs are expected until commercial tiers are published."
      >
        <PricingPlansBlock result={plans} compact />
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </MarketingSection>

      <MarketingSection
        className="bg-muted/30"
        eyebrow="FAQ"
        title="Common questions"
        description="Straight answers about what the product can do today."
      >
        <FaqList items={marketingFaq.slice(0, 5)} />
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/faq">Read all FAQs</Link>
          </Button>
        </div>
      </MarketingSection>

      <MarketingSection>
        <div className="rounded-2xl border bg-card px-6 py-12 text-center shadow-xs sm:px-10">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            {marketingFinalCta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {marketingFinalCta.supporting}
          </p>
          <CtaPair
            className="mt-8 justify-center"
            primary={marketingFinalCta.primaryCta}
            secondary={marketingFinalCta.secondaryCta}
          />
        </div>
      </MarketingSection>
    </>
  );
}
