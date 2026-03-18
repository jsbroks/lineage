import {
  boolean,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { itemType } from "~/server/db/schema/item-types";

export const statusDefinition = pgTable(
  "status_definition",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId:      uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    // verticalId: uuid("vertical_id").notNull().references(() => verticals.id),
    itemTypeId: uuid("item_type_id").references(() => itemType.id),
    slug: text().notNull(),
    name: text().notNull(),
    color: text(),
    isInitial: boolean("is_initial").notNull().default(false),
    isTerminal: boolean("is_terminal").notNull().default(false),
    ordinal: integer().notNull().default(0),
  },
  (t) => [],
);

export const statusDefinitionRelations = relations(
  statusDefinition,
  ({ one }) => ({
    itemType: one(itemType, {
      fields: [statusDefinition.itemTypeId],
      references: [itemType.id],
    }),
  }),
);

export const statusTransition = pgTable(
  "status_transition",
  {
    id: uuid().primaryKey().defaultRandom(),
    fromStatusId: uuid("from_status_id")
      .notNull()
      .references(() => statusDefinition.id),
    toStatusId: uuid("to_status_id")
      .notNull()
      .references(() => statusDefinition.id),
  },
  (t) => [uniqueIndex().on(t.fromStatusId, t.toStatusId)],
);

export const statusTransitionsRelations = relations(
  statusTransition,
  ({ one }) => ({
    fromStatus: one(statusDefinition, {
      fields: [statusTransition.fromStatusId],
      references: [statusDefinition.id],
      relationName: "fromTransitions",
    }),
    toStatus: one(statusDefinition, {
      fields: [statusTransition.toStatusId],
      references: [statusDefinition.id],
      relationName: "toTransitions",
    }),
  }),
);
