import Link from "next/link";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Building2,
  MessageSquare,
  Mic,
  Phone,
  PhoneIncoming,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MarketingCta, MarketingFeature } from "@/content/marketing";

export const featureIconMap: Record<MarketingFeature["iconKey"], LucideIcon> = {
  bot: Bot,
  book: BookOpen,
  mic: Mic,
  "audio-waveform": AudioWaveform,
  phone: Phone,
  "phone-incoming": PhoneIncoming,
  building: Building2,
  users: Users,
  "message-square": MessageSquare,
};

export function MarketingSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-16 sm:py-20 ${className}`}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || title || description) && (
          <div className="mx-auto max-w-2xl text-center">
            {eyebrow ? (
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">{description}</p>
            ) : null}
          </div>
        )}
        <div className={title || description || eyebrow ? "mt-10" : undefined}>{children}</div>
      </div>
    </section>
  );
}

export function CtaPair({
  primary,
  secondary,
  className = "",
}: {
  primary: MarketingCta;
  secondary?: MarketingCta;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Button size="lg" asChild>
        <Link href={primary.href}>{primary.label}</Link>
      </Button>
      {secondary ? (
        <Button size="lg" variant="outline" asChild>
          <Link href={secondary.href}>{secondary.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function FeatureCards({ features }: { features: MarketingFeature[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => {
        const Icon = featureIconMap[feature.iconKey];
        return (
          <li
            key={feature.id}
            id={feature.anchor}
            className="rounded-xl border bg-card p-5 text-left shadow-xs"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductWorkflowVisual() {
  const steps = [
    "Business",
    "AI Agent",
    "Knowledge + Voice",
    "Phone Number",
    "Incoming Caller",
    "AI Conversation",
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((label, index) => (
        <li
          key={label}
          className="relative rounded-xl border bg-card px-4 py-5 text-center shadow-xs"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Step {index + 1}
          </span>
          <p className="mt-2 font-display text-base font-semibold tracking-tight">{label}</p>
          {index < steps.length - 1 ? (
            <span className="sr-only">then</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function FaqList({
  items,
}: {
  items: { id: string; question: string; answer: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl divide-y rounded-xl border bg-card">
      {items.map((item) => (
        <details key={item.id} className="group px-5 py-4">
          <summary className="cursor-pointer list-none font-medium outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-4">
              {item.question}
              <span
                aria-hidden="true"
                className="text-muted-foreground transition group-open:rotate-45"
              >
                +
              </span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
