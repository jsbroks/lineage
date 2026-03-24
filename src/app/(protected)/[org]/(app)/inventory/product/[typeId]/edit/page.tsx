import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { lotType } from "~/server/db/schema/lot-types";
import EditLotTypePage from "./edit-lot-type-page";

type Props = { params: Promise<{ org: string; typeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { typeId } = await params;
  const record = await db.query.lotType.findFirst({
    where: eq(lotType.id, typeId),
  });
  return {
    title: record ? `Edit ${record.name}` : "Edit Product",
  };
}

export default function Page() {
  return <EditLotTypePage />;
}
