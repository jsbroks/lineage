import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { operationType } from "~/server/db/schema/operation-types";
import OperationTypeDetailPage from "./operation-type-detail-page";

type Props = { params: Promise<{ org: string; operationTypeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { operationTypeId } = await params;
  if (operationTypeId === "new") {
    return { title: "New Task Type" };
  }
  const record = await db.query.operationType.findFirst({
    where: eq(operationType.id, operationTypeId),
  });
  return {
    title: record?.name ?? "Task Type",
  };
}

export default function Page() {
  return <OperationTypeDetailPage />;
}
