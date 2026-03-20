import { type Metadata } from "next";
import { HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Home",
};

export default async function Home() {
  return (
    <HydrateClient>
      <main></main>
    </HydrateClient>
  );
}
