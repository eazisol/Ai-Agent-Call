import type { MetadataRoute } from "next";

import { MARKETING_ROBOTS_DISALLOW } from "@/content/marketing";
import { resolveMarketingMetadataBase } from "@/content/marketing-seo";

/**
 * SEO robots foundation.
 * Index guidance only — auth still protects private app surfaces.
 */
export default function robots(): MetadataRoute.Robots {
  const base = resolveMarketingMetadataBase();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...MARKETING_ROBOTS_DISALLOW],
      },
    ],
    sitemap: base ? new URL("/sitemap.xml", base).toString() : undefined,
  };
}