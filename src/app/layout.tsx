import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cogent Marketing Shield | Enterprise Regulatory Compliance",
  description:
    "Standalone Enterprise Regulatory & Marketing Compliance Operating System for Nigerian Financial Institutions.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-canvas text-brand-navy antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
