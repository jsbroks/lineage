import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v4";
import { eq, asc } from "drizzle-orm";

import { db } from "~/server/db";
import {
  lotType,
  lotTypeStatusDefinition,
  lotTypeStatusTransition,
  lotTypeVariant,
  lotTypeAttributeDefinition,
  location,
} from "~/server/db/schema";

export const maxDuration = 15;

/**
 * Resolve relative date expressions (e.g. "-5d", "-1w", "-2m") to ISO date
 * strings. Returns the input unchanged if it's already a valid date.
 */
function resolveRelativeDate(value: string): string {
  const match = value.match(/^-(\d+)([dwmy])$/i);
  if (!match) return value;

  const amount = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const date = new Date();

  switch (unit) {
    case "d":
      date.setDate(date.getDate() - amount);
      break;
    case "w":
      date.setDate(date.getDate() - amount * 7);
      break;
    case "m":
      date.setMonth(date.getMonth() - amount);
      break;
    case "y":
      date.setFullYear(date.getFullYear() - amount);
      break;
  }

  return date.toISOString().split("T")[0]!;
}

export async function POST(req: Request) {
  const { lotTypeId, prompt } = (await req.json()) as {
    lotTypeId: string;
    prompt: string;
  };

  const [it, statuses, transitions, variants, attrDefs, locations] =
    await Promise.all([
      db
        .select()
        .from(lotType)
        .where(eq(lotType.id, lotTypeId))
        .limit(1)
        .then((r) => r[0]),
      db
        .select()
        .from(lotTypeStatusDefinition)
        .where(eq(lotTypeStatusDefinition.lotTypeId, lotTypeId))
        .orderBy(asc(lotTypeStatusDefinition.ordinal)),
      db
        .select({
          fromId: lotTypeStatusTransition.fromStatusId,
          toId: lotTypeStatusTransition.toStatusId,
        })
        .from(lotTypeStatusTransition),
      db
        .select()
        .from(lotTypeVariant)
        .where(eq(lotTypeVariant.lotTypeId, lotTypeId))
        .orderBy(asc(lotTypeVariant.sortOrder)),
      db
        .select()
        .from(lotTypeAttributeDefinition)
        .where(eq(lotTypeAttributeDefinition.lotTypeId, lotTypeId))
        .orderBy(asc(lotTypeAttributeDefinition.sortOrder)),
      db.select().from(location).orderBy(asc(location.name)),
    ]);

  if (!it)
    return Response.json({ error: "Lot type not found" }, { status: 404 });

  // Build a lookup for status names by ID (for transitions)
  const statusNameById = new Map(statuses.map((s) => [s.id, s.name]));

  // Build a rich, structured context for the LLM
  const lines: string[] = [];

  lines.push(`=== TODAY'S DATE ===`);
  lines.push(`${new Date().toISOString().split("T")[0]}`);

  lines.push(`\n=== LOT TYPE ===`);
  lines.push(`Name: ${it.name}`);
  if (it.description) lines.push(`Description: ${it.description}`);
  if (it.codePrefix) lines.push(`Code prefix: ${it.codePrefix}`);

  // Built-in fields
  lines.push(`\n=== BUILT-IN LOT FIELDS ===`);
  lines.push(
    `- "quantity" — the lot's quantity (displayed as "${it.quantityName ?? "Quantity"}"). Use this when the user mentions "${it.quantityName?.toLowerCase() ?? "quantity"}", "amount", "count of quantity", etc.`,
  );
  lines.push(
    `- "value" — the lot's monetary value in cents. Use for cost/price/value questions.`,
  );

  // Statuses
  if (statuses.length > 0) {
    lines.push(`\n=== STATUSES (lifecycle stages) ===`);
    for (const s of statuses) {
      let label = `- "${s.name}" (id: ${s.id})`;
      if (s.isInitial) label += " [INITIAL — lots start here]";
      if (s.isTerminal)
        label +=
          " [TERMINAL — lots end here, not useful for active inventory insights]";
      lines.push(label);
    }

    const relevantTransitions = transitions.filter(
      (t) => statusNameById.has(t.fromId) && statusNameById.has(t.toId),
    );
    if (relevantTransitions.length > 0) {
      lines.push(`\nStatus transitions (allowed workflow):`);
      for (const t of relevantTransitions) {
        lines.push(
          `  ${statusNameById.get(t.fromId)} → ${statusNameById.get(t.toId)}`,
        );
      }
    }
  }

  // Variants
  if (variants.length > 0) {
    lines.push(`\n=== VARIANTS ===`);
    for (const v of variants) {
      lines.push(`- "${v.name}" (id: ${v.id})`);
    }
  }

  // Custom attributes
  if (attrDefs.length > 0) {
    lines.push(`\n=== CUSTOM ATTRIBUTES ===`);
    lines.push(
      `These are accessed via the "attr:<exactKey>" prefix. Keys are CASE-SENSITIVE.`,
    );
    lines.push(
      `IMPORTANT: These attributes can be used for FILTERING via filterAttrFilters. When the user mentions a person, category, or value that matches an attribute's options, use filterAttrFilters to filter by it.`,
    );
    for (const a of attrDefs) {
      let line = `- Key: "${a.attrKey}" → use as "attr:${a.attrKey}"`;
      line += ` | type: ${a.dataType}`;
      if (a.unit) line += ` | unit: ${a.unit}`;
      if (a.isRequired) line += ` | required`;
      if (a.dataType === "select" && Array.isArray(a.options)) {
        line += ` | options: ${(a.options as string[]).join(", ")}`;
        line += ` | filterable: use filterAttrFilters with op "eq" and one of these exact option values`;
      }
      lines.push(line);
    }
  }

  // Locations
  if (locations.length > 0) {
    lines.push(`\n=== LOCATIONS ===`);
    for (const l of locations) {
      lines.push(`- "${l.name}" (id: ${l.id})`);
    }
  }

  // Valid field values reference
  const validGroupBy = ['"status"', '"variant"', '"location"'];
  for (const a of attrDefs) validGroupBy.push(`"attr:${a.attrKey}"`);

  const validMetricFields = [
    `"quantity" (= ${it.quantityName ?? "Quantity"})`,
    '"value" (monetary)',
  ];
  for (const a of attrDefs) {
    if (a.dataType === "number") validMetricFields.push(`"attr:${a.attrKey}"`);
  }

  lines.push(`\n=== VALID FIELD VALUES REFERENCE ===`);
  lines.push(`groupBy (pick 1-4): ${validGroupBy.join(", ")}`);
  lines.push(
    `metric field (for sum/avg/min/max): ${validMetricFields.join(", ")}`,
  );
  lines.push(`metric field (for count): any field, typically "quantity"`);
  lines.push(
    `metric op: "count", "sum", "avg", "min", "max" — DEFAULT to "sum" unless user explicitly asks for a different operation`,
  );

  const schemaContext = lines.join("\n");

  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      groupBy: z
        .array(z.string())
        .describe(
          "Fields to group by. MUST be one of: 'status', 'variant', 'location', or 'attr:<exactKey>' using the exact attribute key from the schema.",
        ),
      metrics: z.array(
        z.object({
          field: z
            .string()
            .describe(
              "MUST be one of: 'quantity', 'value', or 'attr:<exactKey>'. Use 'quantity' for the lot's built-in quantity/weight/amount field. Use 'attr:<key>' ONLY for custom attributes listed in the schema.",
            ),
          op: z.enum(["count", "sum", "avg", "min", "max"]),
        }),
      ),
      filterStatus: z
        .string()
        .describe(
          "Status ID (UUID) to filter by, or empty string for no filter. Must be an exact ID from the statuses list.",
        ),
      filterVariantId: z
        .string()
        .describe(
          "Variant ID (UUID) to filter by, or empty string for no filter. Must be an exact ID from the variants list.",
        ),
      filterLocationId: z
        .string()
        .describe(
          "Location ID (UUID) to filter by, or empty string for no filter. Must be an exact ID from the locations list.",
        ),
      filterAttrFilters: z
        .array(
          z.object({
            key: z
              .string()
              .describe(
                "Exact attribute key from the custom attributes list (case-sensitive, no 'attr:' prefix).",
              ),
            op: z.enum(["eq", "gte", "lte"]),
            value: z
              .string()
              .describe(
                "The filter value. For date attributes, MUST be a full ISO date string (e.g. '2026-03-16'), computed from today's date. NEVER use relative expressions like '-5d'. For select attributes, use the exact option value.",
              ),
          }),
        )
        .describe("Attribute filters, or empty array for none"),
      title: z
        .string()
        .describe(
          "A short human-readable title for this report (under 8 words)",
        ),
    }),
    prompt: `You are a report builder for an inventory tracking system called Lineage. Given the user's natural-language request and the lot type schema below, output structured aggregate query parameters.

${schemaContext}

User request: "${prompt}"

CRITICAL RULES:
1. Use ONLY the exact field values listed in the "VALID FIELD VALUES REFERENCE" section.
2. The built-in "quantity" field represents ${it.quantityName ? `"${it.quantityName}"` : "the lot count"}. When the user mentions "${it.quantityName?.toLowerCase() ?? "quantity"}", "weight", "amount", or similar, use field: "quantity" — NOT "attr:weight" or any made-up field.
3. Use "attr:<key>" ONLY for custom attributes explicitly listed above, with the EXACT key casing shown.
4. For filter IDs, use the exact UUIDs from the schema. Use "" for no filter.
5. Always include at least one groupBy and one metric.
6. DEFAULT to op: "sum" unless the user explicitly asks for a different operation (e.g. "average", "count", "min", "max"). Only use "count" when the user says "how many", "count", or "number of".
7. Generate a short descriptive title.
8. SEMANTIC MATCHING: When the user mentions a concept, person, or action, match it to the CLOSEST relevant attribute by meaning — not just by exact name. For example, if the user says "harvested by Justin" and there is an attribute "Harvested By" with option "Justin", create a filterAttrFilters entry with key "Harvested By", op "eq", value "Justin". Similarly, "picked by Sarah" could match a "Picked By" attribute.
9. ATTRIBUTE FILTERING: When the user mentions a specific name or value alongside an action/concept, check the custom attributes and their options for a semantic match. Use filterAttrFilters with op "eq" and the EXACT option value (preserving casing from the options list). This is how you filter data by who did something, what category it belongs to, etc.
10. When using filterAttrFilters, always use the exact option value casing as shown in the attribute's options list (e.g. "Justin" not "justin").
11. DATE FILTERS: For date attributes, ALWAYS output a fully resolved ISO date string (e.g. "2026-03-16"). NEVER output relative expressions like "-5d", "-1w", "last week", etc. Use today's date from the schema to compute the correct absolute date. For example, if today is 2026-03-21 and the user says "last 5 days", use gte with value "2026-03-16".`,
  });

  // Safety net: fix any casing mismatches on attr keys
  const attrKeyMap = new Map(
    attrDefs.map((a) => [a.attrKey.toLowerCase(), a.attrKey]),
  );

  function fixAttrField(field: string): string {
    if (!field.startsWith("attr:")) return field;
    const raw = field.slice(5);
    const correct = attrKeyMap.get(raw.toLowerCase());
    return correct ? `attr:${correct}` : field;
  }

  // Also map LLM hallucinated attr fields back to built-in fields when possible
  const quantityAliases = new Set(
    [it.quantityName?.toLowerCase(), "weight", "amount", "qty", "count"].filter(
      Boolean,
    ) as string[],
  );

  function resolveField(field: string): string {
    if (field.startsWith("attr:")) {
      const raw = field.slice(5);
      if (
        quantityAliases.has(raw.toLowerCase()) &&
        !attrKeyMap.has(raw.toLowerCase())
      ) {
        return "quantity";
      }
    }
    return fixAttrField(field);
  }

  const groupBy = object.groupBy.map(resolveField);
  const metrics = object.metrics.map((m) => ({
    ...m,
    field: resolveField(m.field),
  }));

  const filters: Record<string, unknown> = {};
  if (object.filterStatus) filters.status = object.filterStatus;
  if (object.filterVariantId) filters.variantId = object.filterVariantId;
  if (object.filterLocationId) filters.locationId = object.filterLocationId;
  if (object.filterAttrFilters.length > 0) {
    const selectOptionsMap = new Map(
      attrDefs
        .filter((a) => a.dataType === "select" && Array.isArray(a.options))
        .map((a) => [
          a.attrKey.toLowerCase(),
          new Map((a.options as string[]).map((o) => [o.toLowerCase(), o])),
        ]),
    );

    const attrDataTypeMap = new Map(
      attrDefs.map((a) => [a.attrKey.toLowerCase(), a.dataType]),
    );

    filters.attrFilters = object.filterAttrFilters.map((af) => {
      const correctKey = attrKeyMap.get(af.key.toLowerCase());
      const key = correctKey ?? af.key;
      let value = af.value;

      const opts = selectOptionsMap.get(key.toLowerCase());
      if (opts) {
        const correctValue = opts.get(value.toLowerCase());
        if (correctValue) value = correctValue;
      }

      if (attrDataTypeMap.get(key.toLowerCase()) === "date") {
        value = resolveRelativeDate(value);
      }

      return { ...af, key, value };
    });
  }

  return Response.json({
    groupBy,
    metrics,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    title: object.title,
  });
}
