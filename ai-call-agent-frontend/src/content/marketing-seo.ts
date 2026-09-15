import type { Metadata } from "next";

import {
  MARKETING_PRODUCT_NAME,
  MARKETING_SHORT_DESCRIPTION,
  marketingOgImageStatus,
  marketingRouteMetadata,
  type MarketingLaunchPath,
} from "./marketing";

export {
  MARKETING_ROBOTS_DISALLOW,
  marketingOgImageStatus,
  marketingRouteMetadata,
  type MarketingRouteMeta,
} from "./marketing";

export const marketingSiteMetadataDefaults = {
  productName: MARKETING_PRODUCT_NAME,
  shortDescription: MARKETING_SHORT_DESCRIPTION,
  titleTemplate: `%s | ${MARKETING_PRODUCT_NAME}`,
  defaultTitle: MARKETING_PRODUCT_NAME,
  metadataBaseEnvKeys: ["NEXT_PUBLIC_SITE_URL", "AUTH_PUBLIC_APP_URL"] as const,
  ogImageStatus: marketingOgImageStatus,
} as const;

export function buildMarketingPageMetadata(
  path: MarketingLaunchPath,
): Metadata {
  const entry = marketingRouteMetadata[path];
  return {
    title: entry.title,
    description: entry.description,
    alternates: {
      canonical: entry.canonicalPath,
    },
    openGraph: {
      title: `${entry.title} | ${MARKETING_PRODUCT_NAME}`,
      description: entry.description,
      url: entry.canonicalPath,
      siteName: MARKETING_PRODUCT_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${entry.title} | ${MARKETING_PRODUCT_NAME}`,
      description: entry.description,
    },
  };
}

/**
 * Resolve metadataBase only from approved env — never invent a domain.
 */
export function resolveMarketingMetadataBase(): URL | undefined {
  for (const key of marketingSiteMetadataDefaults.metadataBaseEnvKeys) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    try {
      return new URL(raw);
    } catch {
      /* ignore invalid */
    }
  }
  return undefined;
}
