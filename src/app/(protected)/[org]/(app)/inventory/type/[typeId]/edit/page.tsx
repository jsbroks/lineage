import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { itemType } from "~/server/db/schema/item-types";
import EditItemTypePage from "./edit-item-type-page";

type Props = { params: Promise<{ org: string; typeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { typeId } = await params;
  const record = await db.query.itemType.findFirst({
    where: eq(itemType.id, typeId),
  });
  return {
    title: record ? `Edit ${record.name}` : "Edit Item Type",
  };
}

export default function Page() {
  return <EditItemTypePage />;
}
