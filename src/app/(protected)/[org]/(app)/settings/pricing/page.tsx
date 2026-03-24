import { type Metadata } from "next";

import PricingSettingsPage from "./pricing-page";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function Page() {
  return <PricingSettingsPage />;
}
