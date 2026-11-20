import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getPublicSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cogent | Fintech & Banking Compliance Software Nigeria & Africa",
    template: "%s | Cogent",
  },
  description:
    "Fintech and banking regulatory compliance management software for Nigeria and Africa. Track CBN circulars, update AML policies, pass sponsor-bank audits, and clear FCCPC, NDPC, and ARCON launches in minutes.",
  applicationName: "Cogent",
  keywords: [
    "fintech compliance software Nigeria",
    "regulatory compliance management software Nigeria",
    "AML compliance software Nigeria",
    "automated regulatory tracking Nigeria",
    "RegTech companies in Nigeria",
    "RegTech Africa",
    "CBN circulars 2026",
    "CBN data localization deadline",
    "CBN baseline standards for automated AML",
    "FCCPC digital lending registration",
    "FCCPC DEON regulations 2025",
    "NDPA 2023 compliance checklist fintech",
    "ARCON advertising vetting guidelines fintech",
    "CBN PSSP licensing requirements Nigeria",
    "BOFIA 2020 compliance checklist",
    "sponsor bank due diligence checklist fintech",
  ],
  authors: [{ name: "Stem Systems", url: siteUrl }],
  creator: "Stem Systems",
  publisher: "Stem Systems",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: siteUrl,
    siteName: "Cogent by Stem Systems",
    title: "Cogent | Fintech & Banking Compliance Software for Nigeria & Africa",
    description:
      "Track CBN, SEC, NDPC, and FCCPC circulars, update AML policies, answer sponsor-bank due diligence, and clear product launches in minutes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cogent | Fintech & Banking Compliance Software Nigeria & Africa",
    description:
      "Track CBN circulars, update AML policies, pass sponsor-bank audits, and clear FCCPC, NDPC, and ARCON launches in minutes.",
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
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
        <body className="min-h-screen bg-white text-[#0B1220] antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
