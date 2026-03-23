import { type Metadata } from "next";
import BillingSettingsPage from "./billing-page";

export const metadata: Metadata = {
  title: "Billing",
};

export default function Page() {
  return <BillingSettingsPage />;
}
