import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { lotType } from "./lot-types";
import { location } from "./location";
import { organization } from "./auth";

export const operationType = pgTable(
  "operation_type",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id),
    name: text().notNull(),
    description: text(),
    icon: text(),
    color: text(),

    defaultLocationId: uuid("default_location_id").references(
      () => location.id,
    ),
    category: text(),
  },
  (t) => [
    uniqueIndex("uq_operation_type_org_name").on(t.orgId, t.name),
    index("idx_operation_type_org").on(t.orgId),
  ],
);

export type OperationType = typeof operationType.$inferSelect;

// ---------------------------------------------------------------------------
// Unified input definition (class table inheritance)
// ---------------------------------------------------------------------------

export const operationTypeInput = pgTable(
  "operation_type_input",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),
    referenceKey: text("reference_key").notNull(),
    label: text("label"),
    description: text("description"),
    type: text("type").notNull(), // 'lots' | 'locations' | 'string' | 'number' | 'date' | ...
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
    options: jsonb().$type<Record<string, unknown>>(),
    defaultValue: jsonb("default_value"),
  },
  (t) => [uniqueIndex().on(t.operationTypeId, t.referenceKey)],
);
export type OperationTypeInput = typeof operationTypeInput.$inferSelect;

export const operationTypeInputLotConfig = pgTable(
  "operation_type_input_lot_config",
  {
    id: uuid().primaryKey().defaultRandom(),
    inputId: uuid("input_id")
      .notNull()
      .unique()
      .references(() => operationTypeInput.id, { onDelete: "cascade" }),
    lotTypeId: uuid("lot_type_id")
      .notNull()
      .references(() => lotType.id),
    minCount: integer("min_count").notNull().default(0),
    maxCount: integer("max_count"),

    preconditionsStatuses: jsonb("preconditions_statuses").$type<string[]>(),
  },
);
export type OperationTypeInputLotConfig =
  typeof operationTypeInputLotConfig.$inferSelect;

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
    config: jsonb("config").default({}),

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
//   - A lot type (lot-level validation on create or status change)
//   - An operation type port (operation-level validation on scan)
//
// Exactly one of lot_type_id or operation_type_port_id is set (not both).
//
// context determines WHEN the rule fires:
//   - 'on_create'           : when a lot of this lot type is created
//   - 'on_status:colonized' : when a lot transitions to 'colonized'
//   - 'on_status:packed'    : when a lot transitions to 'packed'
//   - 'on_scan'             : when a lot is scanned into an operation port
export const validationRule = pgTable(
  "validation_rule",
  {
    id: uuid().primaryKey().defaultRandom(),

    orgId: uuid("org_id").references(() => organization.id),
    lotTypeId: uuid("lot_type_id").references(() => lotType.id, {
      onDelete: "cascade",
    }),
    operationTypePortId: uuid("operation_type_port_id").references(
      () => operationTypeInput.id,
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
  (t) => [index().on(t.lotTypeId), index().on(t.operationTypePortId)],
);
