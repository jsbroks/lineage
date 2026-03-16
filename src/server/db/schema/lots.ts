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
import { itemType } from "./item-types";
import { location } from "./location";
import { user } from "./auth";
import { operation } from "./operation";

export const lot = pgTable(
  "lot",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId: uuid("org_id")
    //   .notNull()
    //   .references(() => organizations.id),
    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id),
    lotCode: text("lot_code").notNull(),
    status: text().notNull().default("created"),
    qtyOnHand: numeric("qty_on_hand").notNull().default("0"),
    qtyReserved: numeric("qty_reserved").notNull().default("0"),
    uom: text().notNull().default("each"),
    locationId: uuid("location_id").references(() => location.id),
    attributes: jsonb().notNull().default({}),
    notes: text(),
    createdBy: uuid("created_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [],
);

export const lotCodeSequence = pgTable(
  "lot_code_sequence",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId: uuid("org_id")
    //   .notNull()
    //   .references(() => organizations.id),
    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id),
    prefix: text().notNull(),
    variantCode: text("variant_code").notNull().default("_"),
    nextNumber: integer("next_number").notNull().default(1),
  },
  (t) => [],
);

export const lotIdentifier = pgTable(
  "lot_identifier",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId: uuid("org_id")
    //   .notNull()
    //   .references(() => organizations.id),
    lotId: uuid("lot_id").references(() => lot.id, { onDelete: "cascade" }),
    identifierType: text("identifier_type").notNull(),
    identifierValue: text("identifier_value").notNull(),
    label: text(),

    assignedTo: uuid("assigned_to").references(() => user.id),
    batchDate: timestamp("batch_date", { withTimezone: true }),

    isActive: boolean("is_active").notNull().default(true),
    printedAt: timestamp("printed_at", { withTimezone: true }),
    linkedAt: timestamp("linked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // When lot_id is NULL (unlinked), these fields tell the system
    // what to create on first scan:
    createItemTypeId: uuid("create_item_type_id").references(() => itemType.id),
    createStatus: text("create_status"),
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
    relationship: text().notNull().default("derived_from"),
    operationId: uuid("operation_id").references(() => operation.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [],
);

export const lotEvent = pgTable(
  "lot_event",
  {
    id: uuid().primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lot.id),
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
    // index("idx_events_lot").on(t.lotId, t.recordedAt),
    // index("idx_events_org").on(t.orgId, t.recordedAt),
    // index("idx_events_type").on(t.orgId, t.eventType),
  ],
);

export const lotGroups = pgTable(
  "lot_groups",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId: uuid("org_id")
    //   .notNull()
    //   .references(() => organizations.id),
    groupCode: text("group_code").notNull(),
    groupType: text("group_type").notNull(),
    name: text(),
    locationId: uuid("location_id").references(() => location.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [],
);

export const lotGroupMembers = pgTable(
  "lot_group_member",
  {
    lotGroupId: uuid("lot_group_id")
      .notNull()
      .references(() => lotGroups.id, { onDelete: "cascade" }),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lot.id),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex().on(t.lotGroupId, t.lotId)],
);
