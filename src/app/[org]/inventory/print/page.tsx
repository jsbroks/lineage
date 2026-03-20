import { type Metadata } from "next";
import { PrintLabelsPage } from "./_components/PrintLabelsPage";

export const metadata: Metadata = {
  title: "Print Labels",
};

type Props = {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ typeId?: string }>;
};

export default async function PrintPage({ params, searchParams }: Props) {
  const { org } = await params;
  const { typeId } = await searchParams;
  return <PrintLabelsPage org={org} initialTypeId={typeId} />;
}
