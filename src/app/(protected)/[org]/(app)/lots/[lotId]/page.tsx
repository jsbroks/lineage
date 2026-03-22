import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { lot } from "~/server/db/schema/lot";
import { lotType } from "~/server/db/schema/lot-types";
import LotDetailPage from "./lot-detail-page";

type Props = { params: Promise<{ org: string; lotId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lotId } = await params;
  const record = await db
    .select({ code: lot.code, typeName: lotType.name })
    .from(lot)
    .leftJoin(lotType, eq(lot.lotTypeId, lotType.id))
    .where(eq(lot.id, lotId))
    .limit(1)
    .then((rows) => rows[0]);
  return {
    title: record ? `${record.code} — ${record.typeName}` : "Lot",
  };
}

export default function Page() {
  return <LotDetailPage />;
}
