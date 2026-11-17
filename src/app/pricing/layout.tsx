import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace Plans & Billing | Cogent",
  description:
    "Manage your Cogent Marketing Shield workspace subscription, plan limits, and Paystack Naira billing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
