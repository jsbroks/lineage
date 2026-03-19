import { redirect } from "next/navigation";

export default function SettingsPage({
  params,
}: {
  params: { org: string };
}) {
  redirect(`/${params.org}/settings/operations`);
}
