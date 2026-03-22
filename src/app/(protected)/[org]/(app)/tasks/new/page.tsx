import { type Metadata } from "next";
import NewTaskTypePage from "./new-task-page";

export const metadata: Metadata = {
  title: "New Task Type",
};

export default function Page() {
  return <NewTaskTypePage />;
}
