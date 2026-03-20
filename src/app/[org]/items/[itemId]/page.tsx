import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { item } from "~/server/db/schema/item";
import { itemType } from "~/server/db/schema/item-types";
import ItemDetailPage from "./item-detail-page";

type Props = { params: Promise<{ org: string; itemId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { itemId } = await params;
  const record = await db
    .select({ code: item.code, typeName: itemType.name })
    .from(item)
    .leftJoin(itemType, eq(item.itemTypeId, itemType.id))
    .where(eq(item.id, itemId))
    .limit(1)
    .then((rows) => rows[0]);
  return {
    title: record ? `${record.code} — ${record.typeName}` : "Item",
  };
}

export default function Page() {
  return <ItemDetailPage />;
}
