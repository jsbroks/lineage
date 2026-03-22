import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "~/server/better-auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const orgs = await auth.api.listOrganizations({ headers: await headers() });

  if (!orgs || orgs.length === 0) {
    redirect("/create-org");
  }

  return <>{children}</>;
}
