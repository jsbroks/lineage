import { type Metadata } from "next";

import NewItemPage from "./new-item-page";

export const metadata: Metadata = {
  title: "New Item",
};

export default function Page() {
  return <NewItemPage />;
}
