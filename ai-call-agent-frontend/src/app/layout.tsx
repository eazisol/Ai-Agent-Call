import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import {
  MARKETING_PRODUCT_NAME,
  MARKETING_SHORT_DESCRIPTION,
} from "@/content/marketing";
import { resolveMarketingMetadataBase } from "@/content/marketing-seo";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const metadataBase = resolveMarketingMetadataBase();

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: {
    default: MARKETING_PRODUCT_NAME,
    template: `%s | ${MARKETING_PRODUCT_NAME}`,
  },
  description: MARKETING_SHORT_DESCRIPTION,
  applicationName: MARKETING_PRODUCT_NAME,
  openGraph: {
    type: "website",
    siteName: MARKETING_PRODUCT_NAME,
    title: MARKETING_PRODUCT_NAME,
    description: MARKETING_SHORT_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: MARKETING_PRODUCT_NAME,
    description: MARKETING_SHORT_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32" }, { url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}