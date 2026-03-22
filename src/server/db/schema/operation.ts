import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { operationType } from "./operation-types";
import { location } from "./location";
import { lot } from "./lot";
import { relations } from "drizzle-orm";

export const operation = pgTable(
  "operation",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId:           uuid("org_id").notNull().references(() => organizations.id),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),
    status: text().notNull().default("completed"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
    performedBy: uuid("performed_by").references(() => user.id),
    locationId: uuid("location_id").references(() => location.id),
    notes: text(),
    attributes: jsonb().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // index("idx_operations_org").on(t.orgId),
    // index("idx_operations_type").on(t.operationTypeId),
    // index("idx_operations_completed").on(t.orgId, t.completedAt),
  ],
);
export type Operation = typeof operation.$inferSelect;

export const operationRelation = relations(operation, ({ many, one }) => ({
  type: one(operationType, {
    fields: [operation.operationTypeId],
    references: [operationType.id],
  }),
  inputLots: many(operationInputLot),
  inputLocations: many(operationInputLocation),
  inputValues: many(operationInputValue),
  steps: many(operationStep),
}));

export const operationInputLot = pgTable(
  "operation_input_lot",
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text("key").notNull(),
    operationId: uuid("operation_id").references(() => operation.id, {
      onDelete: "cascade",
    }),
    lotId: uuid("lot_id").references(() => lot.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex().on(t.operationId, t.key, t.lotId)],
);

export type OperationInputLot = typeof operationInputLot.$inferSelect;

export const operationInputLotRelation = relations(
  operationInputLot,
  ({ one }) => ({
    operation: one(operation, {
      fields: [operationInputLot.operationId],
      references: [operation.id],
    }),
    lot: one(lot, {
      fields: [operationInputLot.lotId],
      references: [lot.id],
    }),
  }),
);

export const operationInputLocation = pgTable(
  "operation_input_location",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationId: uuid("operation_id").references(() => operation.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    locationId: uuid("location_id").references(() => location.id, {
      onDelete: "set null",
    }),
  },
  (t) => [uniqueIndex().on(t.operationId, t.key)],
);

export type OperationInputLocation = typeof operationInputLocation.$inferSelect;
export const operationInputLocationRelation = relations(
  operationInputLocation,
  ({ one }) => ({
    operation: one(operation, {
      fields: [operationInputLocation.operationId],
      references: [operation.id],
    }),
    location: one(location, {
      fields: [operationInputLocation.locationId],
      references: [location.id],
    }),
  }),
);

export const operationInputValue = pgTable(
  "operation_input_value",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationId: uuid("operation_id").references(() => operation.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    value: jsonb(),
  },
  (t) => [uniqueIndex().on(t.operationId, t.key)],
);

export type OperationInputValue = typeof operationInputValue.$inferSelect;
export const operationInputValueRelation = relations(
  operationInputValue,
  ({ one }) => ({
    operation: one(operation, {
      fields: [operationInputValue.operationId],
      references: [operation.id],
    }),
  }),
);

// Backward-compatible aliases (will be removed once all layers are migrated)
/** @deprecated Use operationInputValue */
export const operationInputField = operationInputValue;
/** @deprecated Use OperationInputValue */
export type OperationInputField = OperationInputValue;

export const operationStep = pgTable("operation_step", {
  id: uuid().primaryKey().defaultRandom(),
  operationId: uuid("operation_id").references(() => operation.id, {
    onDelete: "cascade",
  }),

  name: text("name").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  config: jsonb("config").default({}),

  sortOrder: integer("sort_order").notNull(),

  success: boolean("success").notNull().default(true),
  skipped: boolean("skipped").notNull().default(false),
  message: text("message"),
  details: jsonb("details")
    .notNull()
    .$type<Record<string, unknown>>()
    .default({}),
});

export type OperationStep = typeof operationStep.$inferSelect;
export const operationStepRelation = relations(operationStep, ({ one }) => ({
  operation: one(operation, {
    fields: [operationStep.operationId],
    references: [operation.id],
  }),
}));
