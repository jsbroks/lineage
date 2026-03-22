import { type Metadata } from "next";
import NewLotTypePage from "./new-lot-type-page";

export const metadata: Metadata = {
  title: "New Lot Type",
};

export default function Page() {
  return <NewLotTypePage />;
}
