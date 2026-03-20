import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { and, count, desc, eq, gte } from "drizzle-orm";

import { db } from "~/server/db";
import {
  item,
  itemEvent,
  itemType,
  itemTypeStatusDefinition,
  itemTypeVariant,
} from "~/server/db/schema";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { itemTypeId } = (await req.json()) as { itemTypeId: string };

  const [it] = await db
    .select()
    .from(itemType)
    .where(eq(itemType.id, itemTypeId))
    .limit(1);

  if (!it) return new Response("Item type not found", { status: 404 });

  const [statusCounts, variantCounts, todaysEvents] = await Promise.all([
    db
      .select({
        statusName: itemTypeStatusDefinition.name,
        isInitial: itemTypeStatusDefinition.isInitial,
        isTerminal: itemTypeStatusDefinition.isTerminal,
        total: count(),
      })
      .from(item)
      .innerJoin(
        itemTypeStatusDefinition,
        eq(item.statusId, itemTypeStatusDefinition.id),
      )
      .where(eq(item.itemTypeId, itemTypeId))
      .groupBy(
        itemTypeStatusDefinition.name,
        itemTypeStatusDefinition.isInitial,
        itemTypeStatusDefinition.isTerminal,
      ),

    db
      .select({
        variantName: itemTypeVariant.name,
        total: count(),
      })
      .from(item)
      .innerJoin(itemTypeVariant, eq(item.variantId, itemTypeVariant.id))
      .where(eq(item.itemTypeId, itemTypeId))
      .groupBy(itemTypeVariant.name),

    (() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return db
        .select({
          message: itemEvent.message,
          eventType: itemEvent.eventType,
          recordedAt: itemEvent.recordedAt,
          itemCode: item.code,
        })
        .from(itemEvent)
        .innerJoin(item, eq(itemEvent.itemId, item.id))
        .where(
          and(
            eq(item.itemTypeId, itemTypeId),
            gte(itemEvent.recordedAt, todayStart),
          ),
        )
        .orderBy(desc(itemEvent.recordedAt))
        .limit(200);
    })(),
  ]);

  let inProgress = 0;
  let terminal = 0;
  for (const sc of statusCounts) {
    if (sc.isTerminal) terminal += sc.total;
    else inProgress += sc.total;
  }

  let context = `Item Type: ${it.name}`;
  if (it.description) context += `\nDescription: ${it.description}`;
  context += `\nIn-Progress Items: ${inProgress}`;

  if (statusCounts.length > 0) {
    context += `\n\nStatus Breakdown (non-terminal only):`;
    for (const sc of statusCounts) {
      if (sc.isTerminal) continue;
      let label = sc.statusName;
      if (sc.isInitial) label += " (initial)";
      context += `\n- ${label}: ${sc.total}`;
    }
    if (terminal > 0) {
      context += `\n\n(${terminal} items in terminal/completed statuses — excluded from counts above)`;
    }
  }

  if (variantCounts.length > 0) {
    context += `\n\nVariant Breakdown:`;
    for (const vc of variantCounts) {
      context += `\n- ${vc.variantName}: ${vc.total}`;
    }
  }

  context += `\n\nToday's Activity (${todaysEvents.length} events):`;
  if (todaysEvents.length === 0) {
    context += `\n- No events recorded today yet.`;
  } else {
    const byType = new Map<string, number>();
    for (const ev of todaysEvents) {
      byType.set(ev.eventType, (byType.get(ev.eventType) ?? 0) + 1);
    }
    context += `\nEvent type breakdown: ${[...byType.entries()].map(([t, c]) => `${t}: ${c}`).join(", ")}`;
    for (const ev of todaysEvents.slice(0, 30)) {
      context += `\n- [${ev.eventType}] ${ev.itemCode}: ${ev.message ?? "no details"}`;
    }
    if (todaysEvents.length > 30) {
      context += `\n... and ${todaysEvents.length - 30} more events`;
    }
  }

  const result = streamText({
    model: openai("gpt-5.4"),
    system: `
You are a concise inventory analyst providing a daily briefing for a production tracking system.
Given the current state and today's activity for an inventory type, write a brief 2-4 sentence summary.

Focus on: what happened today, current in-progress items, and anything noteworthy.
Do NOT highlight terminal/completed item counts or percentages as insights — those grow monotonically and are not actionable. Only mention completed items if they were completed today as part of today's activity.

Be specific with numbers.
Do not state the item type name in the summary.
If there's no activity today, note that and focus on the current in-progress state.`,
    prompt: context,
  });

  return result.toTextStreamResponse();
}
