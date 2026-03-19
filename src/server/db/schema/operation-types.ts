import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { itemType } from "./item-types";
import { location } from "./location";

export const operationType = pgTable("operation_type", {
  id: uuid().primaryKey().defaultRandom(),
  // verticalId: uuid("vertical_id")
  //   .notNull()
  //   .references(() => verticals.id),
  name: text().notNull(),
  description: text(),
  icon: text(),
  color: text(),

  defaultLocation: uuid("default_location_id").references(() => location.id),
  category: text(),
});

export type OperationType = typeof operationType.$inferSelect;

export const operationTypeInputItem = pgTable(
  "operation_type_input_item",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),

    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id),

    referenceKey: text("reference_key").notNull(),

    qtyMin: numeric("qty_min").default("0"),
    qtyMax: numeric("qty_max"),

    required: boolean("required").notNull().default(false),

    preconditionsStatuses: jsonb("preconditions_statuses").$type<string[]>(),
  },
  (t) => [uniqueIndex().on(t.operationTypeId, t.referenceKey)],
);
export type OperationTypeInputItem = typeof operationTypeInputItem.$inferSelect;

export const operationTypeInputField = pgTable(
  "operation_type_input_field",
  {
    id: uuid().primaryKey().defaultRandom(),
    label: text("label"),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),
    referenceKey: text("reference_key").notNull(),
    description: text("description"),
    type: text("type").notNull(),
    required: boolean("required").notNull().default(false),
    options: jsonb().$type<Record<string, unknown>>(),
    defaultValue: jsonb("default_value"),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [uniqueIndex().on(t.operationTypeId, t.referenceKey)],
);
export type OperationTypeInputField =
  typeof operationTypeInputField.$inferSelect;

export const operationTypeStep = pgTable(
  "operation_type_step",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    value: jsonb("value").default({}),

    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [index().on(t.operationTypeId, t.sortOrder)],
);
export type OperationTypeStep = typeof operationTypeStep.$inferSelect;

// ============================================================================
// 2b. VALIDATION RULES
// ============================================================================
// One table for all validation rules across the system.
// Each rule is attached to either:
//   - An item type (item-level validation on create or status change)
//   - An operation type port (operation-level validation on scan)
//
// Exactly one of item_type_id or operation_type_port_id is set (not both).
//
// context determines WHEN the rule fires:
//   - 'on_create'           : when an item of this item type is created
//   - 'on_status:colonized' : when an item transitions to 'colonized'
//   - 'on_status:packed'    : when an item transitions to 'packed'
//   - 'on_scan'             : when an item is scanned into an operation port
export const validationRule = pgTable(
  "validation_rule",
  {
    id: uuid().primaryKey().defaultRandom(),

    // orgId: uuid("org_id").references(() => organizations.id), // NULL = system default
    itemTypeId: uuid("item_type_id").references(() => itemType.id, {
      onDelete: "cascade",
    }),
    operationTypePortId: uuid("operation_type_port_id").references(
      () => operationTypeInputItem.id,
      { onDelete: "cascade" },
    ),

    trigger: text().notNull(), // 'on_create', 'on_status', 'on_scan'
    triggerStatus: text().notNull(), // 'colonized', 'uncolonized'

    field: text().notNull(), // 'status', 'qty_on_hand', 'attributes.species'
    operator: text().notNull(), // 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists', 'in'
    value: jsonb().notNull(), // the comparison value (string, number, array, boolean)
    message: text().notNull(), // human-readable error message
    severity: text().notNull().default("error"), // 'error' or 'warning'
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index().on(t.itemTypeId), index().on(t.operationTypePortId)],
);
