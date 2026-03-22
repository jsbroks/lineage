import { asc, eq, inArray } from "drizzle-orm";
import { db } from "~/server/db";
import {
  itemType,
  itemTypeVariant,
  itemTypeAttributeDefinition,
  itemTypeStatusDefinition,
  location,
  operationType,
  operationTypeInput,
  operationTypeInputItemConfig,
} from "~/server/db/schema";

export type SchemaContext = {
  prompt: string;
  itemTypes: Awaited<ReturnType<typeof loadItemTypes>>;
  statuses: Awaited<ReturnType<typeof loadStatuses>>;
  variants: Awaited<ReturnType<typeof loadVariants>>;
  locations: Awaited<ReturnType<typeof loadLocations>>;
  attributes: Awaited<ReturnType<typeof loadAttributes>>;
  operationTypes: Awaited<ReturnType<typeof loadOperationTypes>>;
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

function loadOperationTypes() {
  return db.select().from(operationType).orderBy(asc(operationType.name));
}

function loadOperationInputs() {
  return db
    .select()
    .from(operationTypeInput)
    .orderBy(asc(operationTypeInput.sortOrder));
}

function loadOperationItemConfigs() {
  return db.select().from(operationTypeInputItemConfig);
}

export async function buildSchemaContext(): Promise<SchemaContext> {
  const [
    itemTypes,
    statuses,
    variants,
    locations,
    attributes,
    operationTypes,
    opInputs,
    opItemConfigs,
  ] = await Promise.all([
    loadItemTypes(),
    loadStatuses(),
    loadVariants(),
    loadLocations(),
    loadAttributes(),
    loadOperationTypes(),
    loadOperationInputs(),
    loadOperationItemConfigs(),
  ]);

  const configByInputId = new Map(
    opItemConfigs.map((c) => [c.inputId, c]),
  );

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
      const statusLabels = typeStatuses.map((s) => {
        if (s.isTerminal) return `${s.name} (terminal)`;
        if (s.isInitial) return `${s.name} (initial)`;
        return s.name;
      });
      line += ` — Statuses: ${statusLabels.join(", ")}`;
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

  if (operationTypes.length > 0) {
    const inputsByOp = new Map<string, typeof opInputs>();
    for (const inp of opInputs) {
      const arr = inputsByOp.get(inp.operationTypeId) ?? [];
      arr.push(inp);
      inputsByOp.set(inp.operationTypeId, arr);
    }

    lines.push("");
    lines.push("Operations:");
    for (const op of operationTypes) {
      let line = `- ${op.name}`;
      if (op.description) line += ` — ${op.description}`;

      const inputs = inputsByOp.get(op.id) ?? [];
      const itemInputs = inputs.filter((i) => i.type === "items");
      const fieldInputs = inputs.filter((i) => i.type !== "items");

      if (itemInputs.length > 0) {
        const portLabels = itemInputs.map((inp) => {
          const cfg = configByInputId.get(inp.id);
          const typeName = cfg
            ? (itemTypes.find((t) => t.id === cfg.itemTypeId)?.name ?? "unknown")
            : "unknown";
          const statusInfo =
            cfg?.preconditionsStatuses && cfg.preconditionsStatuses.length > 0
              ? ` (${cfg.preconditionsStatuses.join("/")})`
              : "";
          return `${typeName}${statusInfo}`;
        });
        line += ` | Takes: ${portLabels.join(", ")}`;
      }

      if (fieldInputs.length > 0) {
        const fieldLabels = fieldInputs.map(
          (f) =>
            `${f.label ?? f.referenceKey} (${f.type}${f.required ? ", required" : ""})`,
        );
        line += ` | Fields: ${fieldLabels.join(", ")}`;
      }

      lines.push(line);
    }
  }

  return {
    prompt: lines.join("\n"),
    itemTypes,
    statuses,
    variants,
    locations,
    attributes,
    operationTypes,
  };
}
