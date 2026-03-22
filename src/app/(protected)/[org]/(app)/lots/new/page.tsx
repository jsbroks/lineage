import { type Metadata } from "next";

import NewLotPage from "./new-lot-page";

export const metadata: Metadata = {
  title: "New Lot",
};

export default function Page() {
  return <NewLotPage />;
}
