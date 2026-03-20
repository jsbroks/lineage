import { type Metadata } from "next";

import OperationsSettingsPage from "./operations-settings-page";

export const metadata: Metadata = {
  title: "Task Types Settings",
};

export default function Page() {
  return <OperationsSettingsPage />;
}
