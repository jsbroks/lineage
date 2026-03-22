import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";

import { auth } from "~/server/better-auth";
import { buildSchemaContext } from "~/server/ai/build-schema-context";
import { createTools } from "~/server/ai/tools";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const schemaCtx = await buildSchemaContext();
  const tools = createTools(schemaCtx);

  const result = streamText({
    model: openai(process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1"),
    system: `You are a helpful inventory assistant for a production tracking system called Lineage.

Here is the current schema of the inventory system:
${schemaCtx.prompt}

Guidelines:
- When the user asks about inventory, use the available tools to query real data. Do not guess or make up numbers.
- Always cite specific counts, lot codes, and statuses in your answers.
- If a query returns no results, say so clearly.
- Keep answers concise and well-formatted. Use bullet points or tables for lists of lots.
- If you're unsure which lot type or status the user means, ask for clarification.
- You can make multiple tool calls if needed to answer a complex question.
- Do NOT present terminal/completed lot counts or their percentages as key insights or summaries. Terminal lots accumulate indefinitely and are not actionable. Focus on in-progress lots (initial + active statuses) when summarizing inventory health. Only reference completed lots when the user specifically asks about them or when discussing recent completions.

Write operations:
- You have write tools (updateLotStatus, moveLots, executeOperation, bulkUpdateStatus, updateAttributes) that can propose changes to inventory.
- These tools do NOT execute immediately. They return a pending action that the user must confirm via a button in the UI.
- When a write tool returns a pending action (requiresConfirmation: true), briefly describe the proposed change and tell the user to confirm using the card that appears below your message.
- Do NOT say the action has been completed — it is only a proposal until the user confirms.
- For bulk operations, mention how many lots will be affected.
- If a write tool returns an error, explain the issue and suggest corrections.
- If the executeOperation tool says fields are needed, ask the user for those field values before calling the tool again.
- Use updateAttributes to set or change custom attributes on lots (e.g. "harvested_by", "substrate_recipe"). Each lot type has defined attributes listed in the schema above — use the exact attribute key names.

Anomaly detection:
- Use detectAnomalies when the user asks about problems, issues, stuck lots, things needing attention, throughput changes, or unusual patterns.
- The tool checks three things: lots stuck in a status much longer than peers, week-over-week throughput drops, and quantity outliers.
- Present results clearly with specific lot codes, statuses, and numbers. If no anomalies are found, say so.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
