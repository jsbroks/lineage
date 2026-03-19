import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { itemType, itemTypeVariant } from "./item-types";
import { location } from "./location";
import { user } from "./auth";
import { operation } from "./operation";
import { itemTypeStatusDefinition } from "./item-type-status";

export const item = pgTable(
  "item",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId: uuid("org_id")
    //   .notNull()
    //   .references(() => organizations.id),

    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id),

    variantId: uuid("variant_id").references(() => itemTypeVariant.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    statusId: uuid("status_id")
      .notNull()
      .references(() => itemTypeStatusDefinition.id),

    notes: text(),

    quantity: numeric("quantity").notNull().default("0"),
    quantityUnit: text("quantity_unit"),

    value: integer("value").notNull().default(0),
    valueCurrency: text("value_currency"),

    locationId: uuid("location_id").references(() => location.id),
    attributes: jsonb().notNull().default({}),

    createdBy: uuid("created_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex().on(t.itemTypeId, t.code)],
);

export const itemIdentifier = pgTable(
  "item_identifier",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId: uuid("org_id")
    //   .notNull()
    //   .references(() => organizations.id),
    itemId: uuid("item_id")
      .references(() => item.id, { onDelete: "cascade" })
      .notNull(),
    identifierType: text("identifier_type").notNull(),
    identifierValue: text("identifier_value").notNull(),
    label: text(),

    isActive: boolean("is_active").notNull().default(true),
    printedAt: timestamp("printed_at", { withTimezone: true }),
    linkedAt: timestamp("linked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex().on(t.identifierType, t.identifierValue),
    index().on(t.itemId),
    index().on(t.identifierValue),
  ],
);

export const itemLineage = pgTable(
  "item_lineage",
  {
    id: uuid().primaryKey().defaultRandom(),
    parentItemId: uuid("parent_item_id")
      .notNull()
      .references(() => item.id),
    childItemId: uuid("child_item_id")
      .notNull()
      .references(() => item.id),
    relationship: text().notNull(),
    operationId: uuid("operation_id").references(() => operation.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [],
);

export const itemEvent = pgTable(
  "item_event",
  {
    id: uuid().primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => item.id),
    // orgId: uuid("org_id")
    //   .notNull()
    //   .references(() => organizations.id),
    message: text("message"),
    eventType: text("event_type").notNull(),
    operationId: uuid("operation_id").references(() => operation.id),
    oldStatus: text("old_status"),
    newStatus: text("new_status"),
    oldLocationId: uuid("old_location_id").references(() => location.id),
    newLocationId: uuid("new_location_id").references(() => location.id),
    qtyDelta: numeric("qty_delta"),
    payload: jsonb().notNull().default({}),
    recordedBy: uuid("recorded_by").references(() => user.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // index("idx_events_item").on(t.itemId, t.recordedAt),
    // index("idx_events_org").on(t.orgId, t.recordedAt),
    // index("idx_events_type").on(t.orgId, t.eventType),
  ],
);
