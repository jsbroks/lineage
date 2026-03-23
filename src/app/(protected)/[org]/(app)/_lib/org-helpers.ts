import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "~/server/db";
import { organization } from "~/server/db/schema";

export const getOrgBySlug = cache(async (slug: string) => {
  const [org] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);

  if (!org) notFound();
  return org;
});
