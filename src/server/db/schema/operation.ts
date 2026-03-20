import {
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
import { item } from "./item";
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
  items: many(operationInputItem),
  fields: many(operationInputField),
  steps: many(operationStep),
}));

export const operationInputItem = pgTable(
  "operation_input_item",
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text("key").notNull(),
    operationId: uuid("operation_id").references(() => operation.id, {
      onDelete: "cascade",
    }),
    itemId: uuid("item_id").references(() => item.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex().on(t.operationId, t.key, t.itemId)],
);

export type OperationInputItem = typeof operationInputItem.$inferSelect;

export const operationInputItemRelation = relations(
  operationInputItem,
  ({ one }) => ({
    operation: one(operation, {
      fields: [operationInputItem.operationId],
      references: [operation.id],
    }),
    item: one(item, {
      fields: [operationInputItem.itemId],
      references: [item.id],
    }),
  }),
);

export const operationInputField = pgTable(
  "operation_input_field",
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text("key").notNull(),
    operationId: uuid("operation_id").references(() => operation.id, {
      onDelete: "cascade",
    }),
    value: jsonb(),
  },
  (t) => [uniqueIndex().on(t.operationId, t.key)],
);

export type OperationInputField = typeof operationInputField.$inferSelect;
export const operationInputFieldRelation = relations(
  operationInputField,
  ({ one }) => ({
    operation: one(operation, {
      fields: [operationInputField.operationId],
      references: [operation.id],
    }),
  }),
);

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
});

export type OperationStep = typeof operationStep.$inferSelect;
export const operationStepRelation = relations(operationStep, ({ one }) => ({
  operation: one(operation, {
    fields: [operationStep.operationId],
    references: [operation.id],
  }),
}));
