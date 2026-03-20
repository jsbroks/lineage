import { asc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import {
  itemType,
  itemTypeVariant,
  itemTypeAttributeDefinition,
  itemTypeStatusDefinition,
  location,
  operationType,
  operationTypeInputItem,
  operationTypeInputField,
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

function loadOperationPorts() {
  return db.select().from(operationTypeInputItem);
}

function loadOperationFields() {
  return db
    .select()
    .from(operationTypeInputField)
    .orderBy(asc(operationTypeInputField.sortOrder));
}

export async function buildSchemaContext(): Promise<SchemaContext> {
  const [
    itemTypes,
    statuses,
    variants,
    locations,
    attributes,
    operationTypes,
    opPorts,
    opFields,
  ] = await Promise.all([
    loadItemTypes(),
    loadStatuses(),
    loadVariants(),
    loadLocations(),
    loadAttributes(),
    loadOperationTypes(),
    loadOperationPorts(),
    loadOperationFields(),
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
    const portsByOp = new Map<string, typeof opPorts>();
    for (const p of opPorts) {
      const arr = portsByOp.get(p.operationTypeId) ?? [];
      arr.push(p);
      portsByOp.set(p.operationTypeId, arr);
    }

    const fieldsByOp = new Map<string, typeof opFields>();
    for (const f of opFields) {
      const arr = fieldsByOp.get(f.operationTypeId) ?? [];
      arr.push(f);
      fieldsByOp.set(f.operationTypeId, arr);
    }

    lines.push("");
    lines.push("Operations:");
    for (const op of operationTypes) {
      let line = `- ${op.name}`;
      if (op.description) line += ` — ${op.description}`;

      const ports = portsByOp.get(op.id) ?? [];
      if (ports.length > 0) {
        const portLabels = ports.map((p) => {
          const typeName =
            itemTypes.find((t) => t.id === p.itemTypeId)?.name ?? "unknown";
          const statusInfo =
            p.preconditionsStatuses && p.preconditionsStatuses.length > 0
              ? ` (${p.preconditionsStatuses.join("/")})`
              : "";
          return `${typeName}${statusInfo}`;
        });
        line += ` | Takes: ${portLabels.join(", ")}`;
      }

      const fields = fieldsByOp.get(op.id) ?? [];
      if (fields.length > 0) {
        const fieldLabels = fields.map(
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
