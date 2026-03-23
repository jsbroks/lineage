import { type Metadata } from "next";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { operationType } from "~/server/db/schema/operation-types";
import EditTaskTypePage from "./edit-task-page";

type Props = { params: Promise<{ org: string; taskId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  const record = await db.query.operationType.findFirst({
    where: eq(operationType.id, taskId),
  });
  return {
    title: record ? `Edit ${record.name}` : "Edit Activity",
  };
}

export default function Page() {
  return <EditTaskTypePage />;
}
