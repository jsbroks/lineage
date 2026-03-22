import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { and, count, desc, eq, gte } from "drizzle-orm";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import {
  lot,
  lotEvent,
  lotType,
  lotTypeStatusDefinition,
  lotTypeVariant,
} from "~/server/db/schema";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { lotTypeId } = (await req.json()) as { lotTypeId: string };

  const [it] = await db
    .select()
    .from(lotType)
    .where(eq(lotType.id, lotTypeId))
    .limit(1);

  if (!it) return new Response("Lot type not found", { status: 404 });

  const [statusCounts, variantCounts, todaysEvents] = await Promise.all([
    db
      .select({
        statusName: lotTypeStatusDefinition.name,
        category: lotTypeStatusDefinition.category,
        total: count(),
      })
      .from(lot)
      .innerJoin(
        lotTypeStatusDefinition,
        eq(lot.statusId, lotTypeStatusDefinition.id),
      )
      .where(eq(lot.lotTypeId, lotTypeId))
      .groupBy(lotTypeStatusDefinition.name, lotTypeStatusDefinition.category),

    db
      .select({
        variantName: lotTypeVariant.name,
        total: count(),
      })
      .from(lot)
      .innerJoin(lotTypeVariant, eq(lot.variantId, lotTypeVariant.id))
      .where(eq(lot.lotTypeId, lotTypeId))
      .groupBy(lotTypeVariant.name),

    (() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return db
        .select({
          message: lotEvent.message,
          eventType: lotEvent.eventType,
          recordedAt: lotEvent.recordedAt,
          lotCode: lot.code,
        })
        .from(lotEvent)
        .innerJoin(lot, eq(lotEvent.lotId, lot.id))
        .where(
          and(
            eq(lot.lotTypeId, lotTypeId),
            gte(lotEvent.recordedAt, todayStart),
          ),
        )
        .orderBy(desc(lotEvent.recordedAt))
        .limit(200);
    })(),
  ]);

  let inProgress = 0;
  let terminal = 0;
  for (const sc of statusCounts) {
    if (sc.category === "done" || sc.category === "canceled")
      terminal += sc.total;
    else inProgress += sc.total;
  }

  let context = `Lot Type: ${it.name}`;
  if (it.description) context += `\nDescription: ${it.description}`;
  context += `\nIn-Progress Lots: ${inProgress}`;

  if (statusCounts.length > 0) {
    context += `\n\nStatus Breakdown (active only):`;
    for (const sc of statusCounts) {
      if (sc.category === "done" || sc.category === "canceled") continue;
      let label = sc.statusName;
      if (sc.category === "unstarted") label += " (unstarted)";
      context += `\n- ${label}: ${sc.total}`;
    }
    if (terminal > 0) {
      context += `\n\n(${terminal} lots in done/canceled statuses — excluded from counts above)`;
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
      context += `\n- [${ev.eventType}] ${ev.lotCode}: ${ev.message ?? "no details"}`;
    }
    if (todaysEvents.length > 30) {
      context += `\n... and ${todaysEvents.length - 30} more events`;
    }
  }

  const result = streamText({
    model: openai(process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1"),
    system: `
You are a concise inventory analyst providing a daily briefing for a production tracking system.
Given the current state and today's activity for an inventory type, write a brief 2-4 sentence summary.

Focus on: what happened today, current in-progress lots, and anything noteworthy.
Do NOT highlight terminal/completed lot counts or percentages as insights — those grow monotonically and are not actionable. Only mention completed lots if they were completed today as part of today's activity.

Be specific with numbers.
Do not state the lot type name in the summary.
If there's no activity today, note that and focus on the current in-progress state.`,
    prompt: context,
  });

  return result.toTextStreamResponse();
}
