import { type Metadata } from "next";
import TeamSettingsPage from "./team-page";

export const metadata: Metadata = {
  title: "Team",
};

export default function Page() {
  return <TeamSettingsPage />;
}
