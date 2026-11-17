import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getPublicSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cogent | Regulatory Intelligence & Compliance Workflow Engine",
    template: "%s | Cogent",
  },
  description:
    "Know the rules in seconds. Turn scattered Nigerian and African regulations into finished structuring memos, updated AML policies, regulator query responses, audit replies, and cleared launches.",
  applicationName: "Cogent",
  keywords: [
    "Cogent",
    "Stem Systems",
    "Nigerian regulatory intelligence",
    "African fintech compliance",
    "CBN circular research",
    "AML policy drafting Nigeria",
    "FCCPC SEC NDPC compliance",
    "cross-border CBK BoG licensing",
    "stem-cogent.com",
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
    title: "Cogent | Know the Rules in Seconds",
    description:
      "Turn scattered Nigerian and African regulations into finished structuring memos, updated AML policies, audit responses, and cleared launches—without the week-long wait.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cogent | Know the Rules in Seconds",
    description:
      "Turn scattered Nigerian and African regulations into finished structuring memos, updated AML policies, audit responses, and cleared launches.",
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
