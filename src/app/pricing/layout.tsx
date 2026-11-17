import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Paystack Naira Billing",
  description:
    "Start with a 7-day free evaluation pilot or scale across Growth, Scale, and Enterprise plans with live USD-to-NGN Paystack checkout.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing & Paystack Naira Billing | Cogent",
    description:
      "Pre-publication regulatory compliance plans from $149/mo settled seamlessly in Naira via Paystack.",
    url: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
