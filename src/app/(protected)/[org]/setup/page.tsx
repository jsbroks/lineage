import { type Metadata } from "next";
import { SetupWizard } from "./_components/SetupWizard";

export const metadata: Metadata = {
  title: "Setup",
};

export default async function SetupPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  return <SetupWizard org={org} />;
}
