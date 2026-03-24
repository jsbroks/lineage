import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { lotType } from "~/server/db/schema/lot-types";
import LotTypeDetailPage from "./lot-type-detail-page";

type Props = { params: Promise<{ org: string; typeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { typeId } = await params;
  const record = await db.query.lotType.findFirst({
    where: eq(lotType.id, typeId),
  });
  return {
    title: record?.name ?? "Product",
    description: record?.description ?? undefined,
  };
}

export default function Page() {
  return <LotTypeDetailPage />;
}
