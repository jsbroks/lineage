import { type Metadata } from "next";
import NewTaskTypePage from "./new-task-page";

export const metadata: Metadata = {
  title: "New Activity",
};

export default function Page() {
  return <NewTaskTypePage />;
}
