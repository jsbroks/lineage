import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v4";

import { buildSchemaContext } from "~/server/ai/build-schema-context";

export const maxDuration = 15;

export async function GET() {
  const schemaCtx = await buildSchemaContext();

  if (schemaCtx.lotTypes.length === 0) {
    return Response.json({ suggestions: [] });
  }

  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      suggestions: z
        .array(z.string())
        .describe("Exactly 5 short example questions"),
    }),
    prompt: `You are helping a user explore their inventory tracking system called Lineage.

Here is the current schema:
${schemaCtx.prompt}

Generate exactly 5 short, diverse example questions a user might ask about their inventory.
- Questions should reference real lot type names, statuses, variants, and locations from the schema above.
- Mix question types: counts/status overviews, specific lot lookups, lineage/traceability, location queries, and comparisons.
- Keep each question under 12 words.
- Do NOT use generic placeholders — use the actual names from the schema.
- Write them as natural questions a grower or production manager would ask.`,
  });

  return Response.json(object);
}
