import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { itemType } from "~/server/db/schema/item-types";
import ItemTypeDetailPage from "./item-type-detail-page";

type Props = { params: Promise<{ org: string; typeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { typeId } = await params;
  const record = await db.query.itemType.findFirst({
    where: eq(itemType.id, typeId),
  });
  return {
    title: record?.name ?? "Item Type",
    description: record?.description ?? undefined,
  };
}

export default function Page() {
  return <ItemTypeDetailPage />;
}
