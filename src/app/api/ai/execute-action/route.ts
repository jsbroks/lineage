import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import {
  lot,
  lotEvent,
  lotTypeStatusDefinition,
  location,
  operationType,
} from "~/server/db/schema";
import { createAndExecute } from "~/server/engine/operation-execute";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    type: string;
    payload: Record<string, unknown>;
  };

  const { type, payload } = body;

  if (!type || !payload) {
    return NextResponse.json(
      { error: "Missing type or payload" },
      { status: 400 },
    );
  }

  try {
    switch (type) {
      case "updateLotStatus":
      case "bulkUpdateStatus": {
        const lotIds = payload.lotIds as string[];
        const statusId = payload.statusId as string;

        if (!lotIds?.length || !statusId) {
          return NextResponse.json(
            { error: "Missing lotIds or statusId" },
            { status: 400 },
          );
        }

        const oldLots = await db
          .select({ id: lot.id, statusId: lot.statusId })
          .from(lot)
          .where(inArray(lot.id, lotIds));

        const updated = await db
          .update(lot)
          .set({ statusId, updatedAt: new Date() })
          .where(inArray(lot.id, lotIds))
          .returning({ id: lot.id });

        if (updated.length > 0) {
          const allStatusIds = [
            ...new Set([statusId, ...oldLots.map((i) => i.statusId)]),
          ];
          const statusDefs = await db
            .select({
              id: lotTypeStatusDefinition.id,
              name: lotTypeStatusDefinition.name,
            })
            .from(lotTypeStatusDefinition)
            .where(inArray(lotTypeStatusDefinition.id, allStatusIds));
          const nameMap = new Map(statusDefs.map((s) => [s.id, s.name]));
          const newName = nameMap.get(statusId) ?? "unknown";
          const oldStatusMap = new Map(oldLots.map((i) => [i.id, i.statusId]));

          const events = updated
            .filter((u) => oldStatusMap.get(u.id) !== statusId)
            .map((u) => {
              const oldStatusId = oldStatusMap.get(u.id);
              const oldName = oldStatusId
                ? (nameMap.get(oldStatusId) ?? "unknown")
                : null;
              return {
                lotId: u.id,
                eventType: "status_changed" as const,
                oldStatus: oldStatusId ?? null,
                newStatus: statusId,
                message: oldName
                  ? `Status changed from ${oldName} to ${newName} via AI chat.`
                  : `Status set to ${newName} via AI chat.`,
                payload: {},
              };
            });

          if (events.length > 0) {
            await db.insert(lotEvent).values(events);
          }
        }

        return NextResponse.json({ success: true, updated: updated.length });
      }

      case "moveLots": {
        const lotIds = payload.lotIds as string[];
        const locationId = payload.locationId as string;

        if (!lotIds?.length || !locationId) {
          return NextResponse.json(
            { error: "Missing lotIds or locationId" },
            { status: 400 },
          );
        }

        const [loc] = await db
          .select({ name: location.name })
          .from(location)
          .where(eq(location.id, locationId))
          .limit(1);

        const updated = await db
          .update(lot)
          .set({ locationId, updatedAt: new Date() })
          .where(inArray(lot.id, lotIds))
          .returning({ id: lot.id });

        if (updated.length > 0) {
          await db.insert(lotEvent).values(
            updated.map((u) => ({
              lotId: u.id,
              eventType: "location_changed" as const,
              newLocationId: locationId,
              message: `Moved to ${loc?.name ?? "location"} via AI chat.`,
              payload: {},
            })),
          );
        }

        return NextResponse.json({ success: true, updated: updated.length });
      }

      case "executeOperation": {
        const operationTypeId = payload.operationTypeId as string;
        const inputs = (payload.inputs as Record<string, unknown>) ?? {};

        if (!operationTypeId) {
          return NextResponse.json(
            { error: "Missing operationTypeId" },
            { status: 400 },
          );
        }

        const result = await db.transaction(async (tx) => {
          const opType = await tx.query.operationType.findFirst({
            where: eq(operationType.id, operationTypeId),
          });

          if (!opType) {
            throw new Error("Operation type not found");
          }

          const execResult = await createAndExecute(tx, opType, inputs);

          if (!execResult) {
            throw new Error("Failed to execute operation");
          }

          return execResult;
        });

        return NextResponse.json({ success: true, result });
      }

      case "updateAttributes": {
        const lotIds = payload.lotIds as string[];
        const attributes = payload.attributes as Record<string, unknown>;

        if (!lotIds?.length || !attributes) {
          return NextResponse.json(
            { error: "Missing lotIds or attributes" },
            { status: 400 },
          );
        }

        let updatedCount = 0;
        const eventRows: {
          lotId: string;
          eventType: string;
          message: string;
          payload: Record<string, unknown>;
        }[] = [];

        const existingLots = await db
          .select({ id: lot.id, attributes: lot.attributes })
          .from(lot)
          .where(inArray(lot.id, lotIds));

        for (const existing of existingLots) {
          const oldAttrs =
            (existing.attributes as Record<string, unknown>) ?? {};
          const merged = { ...oldAttrs, ...attributes };
          await db
            .update(lot)
            .set({ attributes: merged, updatedAt: new Date() })
            .where(eq(lot.id, existing.id));
          updatedCount++;

          const changes: Record<string, { from: unknown; to: unknown }> = {};
          for (const key of Object.keys(attributes)) {
            const oldVal = oldAttrs[key] ?? null;
            const newVal = attributes[key] ?? null;
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
              changes[key] = { from: oldVal, to: newVal };
            }
          }

          if (Object.keys(changes).length > 0) {
            const changedKeys = Object.keys(changes);
            const summary =
              changedKeys.length <= 3
                ? changedKeys.join(", ")
                : `${changedKeys.slice(0, 3).join(", ")} +${changedKeys.length - 3} more`;

            eventRows.push({
              lotId: existing.id,
              eventType: "attributes_updated",
              message: `${summary} updated via AI chat.`,
              payload: { changes },
            });
          }
        }

        if (eventRows.length > 0) {
          await db.insert(lotEvent).values(eventRows);
        }

        return NextResponse.json({ success: true, updated: updatedCount });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action type: ${type}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Execute action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
