import { type Metadata } from "next";
import NewItemTypePage from "./new-item-type-page";

export const metadata: Metadata = {
  title: "New Item Type",
};

export default function Page() {
  return <NewItemTypePage />;
}
