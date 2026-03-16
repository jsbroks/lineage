import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
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

// via operation_type_port_id.
export const operationTypePorts = pgTable(
  "operation_type_ports",
  {
    id: uuid().primaryKey().defaultRandom(),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),
    direction: operationDirection().notNull(),
    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id),
    portRole: text("port_role").notNull(),
    qtyMin: numeric("qty_min"),
    qtyMax: numeric("qty_max"),
    uom: text().notNull().default("each"),
    isConsumed: boolean("is_consumed").notNull().default(true),
    isRequired: boolean("is_required").notNull().default(true),
    config: jsonb().notNull().default({}),
  },
  (t) => [uniqueIndex().on(t.operationTypeId, t.direction, t.portRole)],
);
export type OperationTypePort = typeof operationTypePorts.$inferSelect;
