import { type Metadata } from "next";
import NewLotTypePage from "./new-lot-type-page";

export const metadata: Metadata = {
  title: "New Product",
};

export default function Page() {
  return <NewLotTypePage />;
}
