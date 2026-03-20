import { asc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import {
  itemType,
  itemTypeVariant,
  itemTypeAttributeDefinition,
  itemTypeStatusDefinition,
  location,
} from "~/server/db/schema";

export type SchemaContext = {
  prompt: string;
  itemTypes: Awaited<ReturnType<typeof loadItemTypes>>;
  statuses: Awaited<ReturnType<typeof loadStatuses>>;
  variants: Awaited<ReturnType<typeof loadVariants>>;
  locations: Awaited<ReturnType<typeof loadLocations>>;
  attributes: Awaited<ReturnType<typeof loadAttributes>>;
};

function loadItemTypes() {
  return db.select().from(itemType).orderBy(asc(itemType.name));
}

function loadStatuses() {
  return db
    .select()
    .from(itemTypeStatusDefinition)
    .orderBy(asc(itemTypeStatusDefinition.ordinal));
}

function loadVariants() {
  return db
    .select()
    .from(itemTypeVariant)
    .orderBy(asc(itemTypeVariant.sortOrder));
}

function loadLocations() {
  return db.select().from(location).orderBy(asc(location.name));
}

function loadAttributes() {
  return db
    .select()
    .from(itemTypeAttributeDefinition)
    .orderBy(asc(itemTypeAttributeDefinition.sortOrder));
}

export async function buildSchemaContext(): Promise<SchemaContext> {
  const [itemTypes, statuses, variants, locations, attributes] =
    await Promise.all([
      loadItemTypes(),
      loadStatuses(),
      loadVariants(),
      loadLocations(),
      loadAttributes(),
    ]);

  const statusesByType = new Map<string, typeof statuses>();
  for (const s of statuses) {
    const arr = statusesByType.get(s.itemTypeId) ?? [];
    arr.push(s);
    statusesByType.set(s.itemTypeId, arr);
  }

  const variantsByType = new Map<string, typeof variants>();
  for (const v of variants) {
    const arr = variantsByType.get(v.itemTypeId) ?? [];
    arr.push(v);
    variantsByType.set(v.itemTypeId, arr);
  }

  const attrsByType = new Map<string, typeof attributes>();
  for (const a of attributes) {
    const arr = attrsByType.get(a.itemTypeId) ?? [];
    arr.push(a);
    attrsByType.set(a.itemTypeId, arr);
  }

  const lines: string[] = ["Item Types:"];
  for (const t of itemTypes) {
    const typeStatuses = statusesByType.get(t.id) ?? [];
    const typeVariants = variantsByType.get(t.id) ?? [];
    const typeAttrs = attrsByType.get(t.id) ?? [];

    let line = `- ${t.name}`;
    if (t.codePrefix) line += ` (prefix: ${t.codePrefix})`;
    if (typeStatuses.length > 0) {
      line += ` — Statuses: ${typeStatuses.map((s) => s.name).join(", ")}`;
    }
    if (typeVariants.length > 0) {
      line += ` — Variants: ${typeVariants.map((v) => v.name).join(", ")}`;
    }
    if (typeAttrs.length > 0) {
      line += ` — Attributes: ${typeAttrs.map((a) => `${a.attrKey} (${a.dataType})`).join(", ")}`;
    }
    lines.push(line);
  }

  if (locations.length > 0) {
    lines.push("");
    lines.push(
      `Locations: ${locations.map((l) => `${l.name} (${l.type})`).join(", ")}`,
    );
  }

  return {
    prompt: lines.join("\n"),
    itemTypes,
    statuses,
    variants,
    locations,
    attributes,
  };
}
