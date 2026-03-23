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
import { lotType, lotTypeVariant } from "./lot-types";
import { location } from "./location";
import { user } from "./auth";
import { operation } from "./operation";
import { lotTypeStatusDefinition } from "./lot-type-status";

export const lot = pgTable(
  "lot",
  {
    id: uuid().primaryKey().defaultRandom(),

    lotTypeId: uuid("lot_type_id")
      .notNull()
      .references(() => lotType.id),

    variantId: uuid("variant_id").references(() => lotTypeVariant.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    statusId: uuid("status_id")
      .notNull()
      .references(() => lotTypeStatusDefinition.id),

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
  (t) => [uniqueIndex().on(t.lotTypeId, t.code)],
);

export type Lot = typeof lot.$inferSelect;

export const lotIdentifier = pgTable(
  "lot_identifier",
  {
    id: uuid().primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .references(() => lot.id, { onDelete: "cascade" })
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
    index().on(t.lotId),
    index().on(t.identifierValue),
  ],
);

export const lotLineage = pgTable(
  "lot_lineage",
  {
    id: uuid().primaryKey().defaultRandom(),
    parentLotId: uuid("parent_lot_id")
      .notNull()
      .references(() => lot.id),
    childLotId: uuid("child_lot_id")
      .notNull()
      .references(() => lot.id),
    relationship: text().notNull(),
    operationId: uuid("operation_id").references(() => operation.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index().on(t.parentLotId), index().on(t.childLotId)],
);

export type LotLineage = typeof lotLineage.$inferSelect;

export const lotEvent = pgTable(
  "lot_event",
  {
    id: uuid().primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lot.id),
    operationId: uuid("operation_id").references(() => operation.id),
    name: text("name").notNull(),
    eventType: text("event_type").notNull(),
    attributes: jsonb().notNull().default({}),
    recordedBy: uuid("recorded_by").references(() => user.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index().on(t.lotId), index().on(t.operationId)],
);

export type LotEvent = typeof lotEvent.$inferSelect;
