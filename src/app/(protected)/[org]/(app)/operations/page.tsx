import { type Metadata } from "next";

import OperationsPage from "./operations-page";

export const metadata: Metadata = {
  title: "Record Task",
};

export default function Page() {
  return <OperationsPage />;
}
