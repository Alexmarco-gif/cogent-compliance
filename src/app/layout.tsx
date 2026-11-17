import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getPublicSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cogent | Nigerian Regulatory Compliance Operating System",
    template: "%s | Cogent",
  },
  description:
    "Verify financial promotional copy, loan flyers, effective APR math, and live URLs against CBN, FCCPC, ARCON, NDPC, and SEC rules before publication.",
  applicationName: "Cogent Marketing Shield",
  keywords: [
    "Nigerian RegTech",
    "CBN compliance",
    "FCCPC DEON compliance",
    "ARCON pre-vetting",
    "NDPA 2023 compliance",
    "SEC Nigeria marketing compliance",
    "effective APR calculator Nigeria",
    "financial marketing compliance",
    "Stem-Cogent",
    "Cogent Marketing Shield",
  ],
  authors: [{ name: "Stem-Cogent", url: siteUrl }],
  creator: "Stem-Cogent",
  publisher: "Stem-Cogent",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: siteUrl,
    siteName: "Cogent Marketing Shield",
    title: "Cogent | Nigerian Regulatory Compliance Operating System",
    description:
      "Pre-publication marketing compliance, deterministic APR verification, flyer OCR forensics, and 2-year SHA-256 dossiers across CBN, FCCPC, ARCON, NDPC, and SEC.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cogent | Nigerian Regulatory Compliance Operating System",
    description:
      "Verify financial promotional copy, loan flyers, effective APR math, and live URLs against CBN, FCCPC, ARCON, NDPC, and SEC rules before publication.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          />
        </head>
        <body className="min-h-screen bg-white text-zinc-950 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
