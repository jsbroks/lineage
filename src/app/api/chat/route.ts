import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";

import { buildSchemaContext } from "~/server/ai/build-schema-context";
import { createTools } from "~/server/ai/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const schemaCtx = await buildSchemaContext();
  const tools = createTools(schemaCtx);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful inventory assistant for a production tracking system called Lineage.

Here is the current schema of the inventory system:
${schemaCtx.prompt}

Guidelines:
- When the user asks about inventory, use the available tools to query real data. Do not guess or make up numbers.
- Always cite specific counts, item codes, and statuses in your answers.
- If a query returns no results, say so clearly.
- Keep answers concise and well-formatted. Use bullet points or tables for lists of items.
- If you're unsure which item type or status the user means, ask for clarification.
- You can make multiple tool calls if needed to answer a complex question.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
