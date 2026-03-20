import { type Metadata } from "next";
import TasksPage from "./tasks-page";

export const metadata: Metadata = {
  title: "Task Types",
};

export default function Page() {
  return <TasksPage />;
}
