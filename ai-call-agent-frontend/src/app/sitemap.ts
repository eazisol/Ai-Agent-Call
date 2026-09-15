import type { MetadataRoute } from "next";

import { getSitemapReadyPaths } from "@/content/marketing";
import { resolveMarketingMetadataBase } from "@/content/marketing-seo";

/**
 * Sitemap foundation — only paths marked sitemap-ready.
 * P1.03 flips MARKETING_SITEMAP_READY when pages ship (avoids advertising 404s).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveMarketingMetadataBase();
  const paths = getSitemapReadyPaths();

  return paths.map((path) => ({
    url: base ? new URL(path, base).toString() : path,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
