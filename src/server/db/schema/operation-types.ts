import {
  boolean,
  index,
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

export const operationType = pgTable("operation_type", {
  id: uuid().primaryKey().defaultRandom(),
  // verticalId: uuid("vertical_id")
  //   .notNull()
  //   .references(() => verticals.id),
  slug: text().notNull(),
  name: text().notNull(),
  description: text(),
  icon: text(),

  config: jsonb().notNull().default({}),
});
export type OperationType = typeof operationType.$inferSelect;

export const operationDirection = pgEnum("operation_direction", {
  INPUT: "input",
  OUTPUT: "output",
});

export const operationTypePort = pgTable(
  "operation_type_port",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),

    direction: operationDirection("direction").notNull(),

    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id),

    portRole: text("port_role").notNull(),

    qtyMin: numeric("qty_min").default("0"),
    qtyMax: numeric("qty_max"),

    uom: text().notNull().default("each"),

    isConsumed: boolean("is_consumed").notNull().default(true),
    isRequired: boolean("is_required").notNull().default(true),

    preconditionsStatuses: jsonb("preconditions_statuses").$type<string[]>(),
  },
  (t) => [uniqueIndex().on(t.operationTypeId, t.direction, t.portRole)],
);
export type OperationTypePort = typeof operationTypePort.$inferSelect;

export const operationTypeField = pgTable(
  "operation_type_field",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),
    key: text().notNull(),
    description: text(),
    fieldType: text("field_type").notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    options: jsonb().$type<Record<string, unknown>>(),
    defaultValue: jsonb("default_value"),
    sortOrder: numeric("sort_order").notNull().default("0"),

    scanMethod: text("scan_method"),
    isAuto: boolean("is_auto").notNull().default(false),
    enumOptions: jsonb("enum_options").$type<string[]>(),
  },
  (t) => [uniqueIndex().on(t.operationTypeId, t.key)],
);
export type OperationTypeField = typeof operationTypeField.$inferSelect;

export const operationTypeStep = pgTable(
  "operation_type_step",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),

    name: text().notNull(),
    action: text().notNull(),

    target: text(),

    value: jsonb(),

    sortOrder: numeric("sort_order").notNull().default("0"),
    itemType: text("item_type"),

    eventType: text("event_type"),
  },
  (t) => [index().on(t.operationTypeId)],
);
export type OperationTypeStep = typeof operationTypeStep.$inferSelect;

// ============================================================================
// 2b. VALIDATION RULES
// ============================================================================
// One table for all validation rules across the system.
// Each rule is attached to either:
//   - An item type (lot-level validation on create or status change)
//   - An operation type port (operation-level validation on scan)
//
// Exactly one of item_type_id or operation_type_port_id is set (not both).
//
// context determines WHEN the rule fires:
//   - 'on_create'           : when a lot of this item type is created
//   - 'on_status:colonized' : when a lot transitions to 'colonized'
//   - 'on_status:packed'    : when a lot transitions to 'packed'
//   - 'on_scan'             : when a lot is scanned into an operation port
export const validationRule = pgTable(
  "validation_rule",
  {
    id: uuid().primaryKey().defaultRandom(),

    // orgId: uuid("org_id").references(() => organizations.id), // NULL = system default
    itemTypeId: uuid("item_type_id").references(() => itemType.id, {
      onDelete: "cascade",
    }),
    operationTypePortId: uuid("operation_type_port_id").references(
      () => operationTypePort.id,
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
