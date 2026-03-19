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

export const itemTypeStatusDefinition = pgTable(
  "item_type_status_definition",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId:      uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    // verticalId: uuid("vertical_id").notNull().references(() => verticals.id),
    itemTypeId: uuid("item_type_id")
      .references(() => itemType.id)
      .notNull(),
    name: text().notNull(),
    color: text(),
    isInitial: boolean("is_initial").notNull().default(false),
    isTerminal: boolean("is_terminal").notNull().default(false),
    ordinal: integer().notNull().default(0),
  },
  (t) => [],
);

export type ItemTypeStatusDefinition =
  typeof itemTypeStatusDefinition.$inferSelect;

export const itemTypeStatusDefinitionRelations = relations(
  itemTypeStatusDefinition,
  ({ one }) => ({
    itemType: one(itemType, {
      fields: [itemTypeStatusDefinition.itemTypeId],
      references: [itemType.id],
    }),
  }),
);

export const itemTypeStatusTransition = pgTable(
  "item_type_status_transition",
  {
    id: uuid().primaryKey().defaultRandom(),
    fromStatusId: uuid("from_status_id")
      .notNull()
      .references(() => itemTypeStatusDefinition.id),
    toStatusId: uuid("to_status_id")
      .notNull()
      .references(() => itemTypeStatusDefinition.id),
  },
  (t) => [uniqueIndex().on(t.fromStatusId, t.toStatusId)],
);

export const itemTypeStatusTransitionRelations = relations(
  itemTypeStatusTransition,
  ({ one }) => ({
    fromStatus: one(itemTypeStatusDefinition, {
      fields: [itemTypeStatusTransition.fromStatusId],
      references: [itemTypeStatusDefinition.id],
      relationName: "fromTransitions",
    }),
    toStatus: one(itemTypeStatusDefinition, {
      fields: [itemTypeStatusTransition.toStatusId],
      references: [itemTypeStatusDefinition.id],
      relationName: "toTransitions",
    }),
  }),
);
