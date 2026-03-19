import { PrintLabelsPage } from "./_components/PrintLabelsPage";

type Props = {
  params: Promise<{ org: string }>;
};

export default async function PrintPage({ params }: Props) {
  const { org } = await params;
  return <PrintLabelsPage org={org} />;
}
