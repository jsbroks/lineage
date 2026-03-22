import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import {
  item,
  itemEvent,
  itemTypeStatusDefinition,
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
      case "updateItemStatus":
      case "bulkUpdateStatus": {
        const itemIds = payload.itemIds as string[];
        const statusId = payload.statusId as string;

        if (!itemIds?.length || !statusId) {
          return NextResponse.json(
            { error: "Missing itemIds or statusId" },
            { status: 400 },
          );
        }

        const oldItems = await db
          .select({ id: item.id, statusId: item.statusId })
          .from(item)
          .where(inArray(item.id, itemIds));

        const updated = await db
          .update(item)
          .set({ statusId, updatedAt: new Date() })
          .where(inArray(item.id, itemIds))
          .returning({ id: item.id });

        if (updated.length > 0) {
          const allStatusIds = [
            ...new Set([statusId, ...oldItems.map((i) => i.statusId)]),
          ];
          const statusDefs = await db
            .select({
              id: itemTypeStatusDefinition.id,
              name: itemTypeStatusDefinition.name,
            })
            .from(itemTypeStatusDefinition)
            .where(inArray(itemTypeStatusDefinition.id, allStatusIds));
          const nameMap = new Map(statusDefs.map((s) => [s.id, s.name]));
          const newName = nameMap.get(statusId) ?? "unknown";
          const oldStatusMap = new Map(oldItems.map((i) => [i.id, i.statusId]));

          const events = updated
            .filter((u) => oldStatusMap.get(u.id) !== statusId)
            .map((u) => {
              const oldStatusId = oldStatusMap.get(u.id);
              const oldName = oldStatusId
                ? (nameMap.get(oldStatusId) ?? "unknown")
                : null;
              return {
                itemId: u.id,
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
            await db.insert(itemEvent).values(events);
          }
        }

        return NextResponse.json({ success: true, updated: updated.length });
      }

      case "moveItems": {
        const itemIds = payload.itemIds as string[];
        const locationId = payload.locationId as string;

        if (!itemIds?.length || !locationId) {
          return NextResponse.json(
            { error: "Missing itemIds or locationId" },
            { status: 400 },
          );
        }

        const [loc] = await db
          .select({ name: location.name })
          .from(location)
          .where(eq(location.id, locationId))
          .limit(1);

        const updated = await db
          .update(item)
          .set({ locationId, updatedAt: new Date() })
          .where(inArray(item.id, itemIds))
          .returning({ id: item.id });

        if (updated.length > 0) {
          await db.insert(itemEvent).values(
            updated.map((u) => ({
              itemId: u.id,
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
        const itemIds = payload.itemIds as string[];
        const attributes = payload.attributes as Record<string, unknown>;

        if (!itemIds?.length || !attributes) {
          return NextResponse.json(
            { error: "Missing itemIds or attributes" },
            { status: 400 },
          );
        }

        let updatedCount = 0;
        const eventRows: {
          itemId: string;
          eventType: string;
          message: string;
          payload: Record<string, unknown>;
        }[] = [];

        const existingItems = await db
          .select({ id: item.id, attributes: item.attributes })
          .from(item)
          .where(inArray(item.id, itemIds));

        for (const existing of existingItems) {
          const oldAttrs =
            (existing.attributes as Record<string, unknown>) ?? {};
          const merged = { ...oldAttrs, ...attributes };
          await db
            .update(item)
            .set({ attributes: merged, updatedAt: new Date() })
            .where(eq(item.id, existing.id));
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
              itemId: existing.id,
              eventType: "attributes_updated",
              message: `${summary} updated via AI chat.`,
              payload: { changes },
            });
          }
        }

        if (eventRows.length > 0) {
          await db.insert(itemEvent).values(eventRows);
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
