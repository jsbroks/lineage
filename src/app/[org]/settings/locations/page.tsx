import { type Metadata } from "next";

import LocationsSettingsPage from "./locations-page";

export const metadata: Metadata = {
  title: "Locations",
};

export default function Page() {
  return <LocationsSettingsPage />;
}
