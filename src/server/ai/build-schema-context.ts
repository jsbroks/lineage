import { asc, eq, inArray } from "drizzle-orm";
import { db } from "~/server/db";
import {
  lotType,
  lotTypeVariant,
  lotTypeAttributeDefinition,
  lotTypeStatusDefinition,
  location,
  operationType,
  operationTypeInput,
  operationTypeInputLotConfig,
} from "~/server/db/schema";

export type SchemaContext = {
  prompt: string;
  lotTypes: Awaited<ReturnType<typeof loadLotTypes>>;
  statuses: Awaited<ReturnType<typeof loadStatuses>>;
  variants: Awaited<ReturnType<typeof loadVariants>>;
  locations: Awaited<ReturnType<typeof loadLocations>>;
  attributes: Awaited<ReturnType<typeof loadAttributes>>;
  operationTypes: Awaited<ReturnType<typeof loadOperationTypes>>;
};

function loadLotTypes() {
  return db.select().from(lotType).orderBy(asc(lotType.name));
}

function loadStatuses() {
  return db
    .select()
    .from(lotTypeStatusDefinition)
    .orderBy(asc(lotTypeStatusDefinition.ordinal));
}

function loadVariants() {
  return db
    .select()
    .from(lotTypeVariant)
    .orderBy(asc(lotTypeVariant.sortOrder));
}

function loadLocations() {
  return db.select().from(location).orderBy(asc(location.name));
}

function loadAttributes() {
  return db
    .select()
    .from(lotTypeAttributeDefinition)
    .orderBy(asc(lotTypeAttributeDefinition.sortOrder));
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

function loadOperationLotConfigs() {
  return db.select().from(operationTypeInputLotConfig);
}

export async function buildSchemaContext(): Promise<SchemaContext> {
  const [
    lotTypes,
    statuses,
    variants,
    locations,
    attributes,
    operationTypes,
    opInputs,
    opLotConfigs,
  ] = await Promise.all([
    loadLotTypes(),
    loadStatuses(),
    loadVariants(),
    loadLocations(),
    loadAttributes(),
    loadOperationTypes(),
    loadOperationInputs(),
    loadOperationLotConfigs(),
  ]);

  const configByInputId = new Map(
    opLotConfigs.map((c) => [c.inputId, c]),
  );

  const statusesByType = new Map<string, typeof statuses>();
  for (const s of statuses) {
    const arr = statusesByType.get(s.lotTypeId) ?? [];
    arr.push(s);
    statusesByType.set(s.lotTypeId, arr);
  }

  const variantsByType = new Map<string, typeof variants>();
  for (const v of variants) {
    const arr = variantsByType.get(v.lotTypeId) ?? [];
    arr.push(v);
    variantsByType.set(v.lotTypeId, arr);
  }

  const attrsByType = new Map<string, typeof attributes>();
  for (const a of attributes) {
    const arr = attrsByType.get(a.lotTypeId) ?? [];
    arr.push(a);
    attrsByType.set(a.lotTypeId, arr);
  }

  const lines: string[] = ["Lot Types:"];
  for (const t of lotTypes) {
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
      const lotInputs = inputs.filter((i) => i.type === "lots");
      const fieldInputs = inputs.filter((i) => i.type !== "lots");

      if (lotInputs.length > 0) {
        const portLabels = lotInputs.map((inp) => {
          const cfg = configByInputId.get(inp.id);
          const typeName = cfg
            ? (lotTypes.find((t) => t.id === cfg.lotTypeId)?.name ?? "unknown")
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
    lotTypes,
    statuses,
    variants,
    locations,
    attributes,
    operationTypes,
  };
}
