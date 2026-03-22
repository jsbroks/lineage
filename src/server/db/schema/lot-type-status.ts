import {
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { lotType } from "~/server/db/schema/lot-types";

export const lotTypeStatusDefinition = pgTable(
  "lot_type_status_definition",
  {
    id: uuid().primaryKey().defaultRandom(),
    lotTypeId: uuid("lot_type_id")
      .references(() => lotType.id)
      .notNull(),
    name: text().notNull(),
    color: text(),
    category: text().notNull().default("unstarted"),
    ordinal: integer().notNull().default(0),
  },
  (t) => [],
);

export type LotTypeStatusDefinition =
  typeof lotTypeStatusDefinition.$inferSelect;

export const lotTypeStatusDefinitionRelations = relations(
  lotTypeStatusDefinition,
  ({ one }) => ({
    lotType: one(lotType, {
      fields: [lotTypeStatusDefinition.lotTypeId],
      references: [lotType.id],
    }),
  }),
);

export const lotTypeStatusTransition = pgTable(
  "lot_type_status_transition",
  {
    id: uuid().primaryKey().defaultRandom(),
    fromStatusId: uuid("from_status_id")
      .notNull()
      .references(() => lotTypeStatusDefinition.id),
    toStatusId: uuid("to_status_id")
      .notNull()
      .references(() => lotTypeStatusDefinition.id),
  },
  (t) => [uniqueIndex().on(t.fromStatusId, t.toStatusId)],
);

export const lotTypeStatusTransitionRelations = relations(
  lotTypeStatusTransition,
  ({ one }) => ({
    fromStatus: one(lotTypeStatusDefinition, {
      fields: [lotTypeStatusTransition.fromStatusId],
      references: [lotTypeStatusDefinition.id],
      relationName: "fromTransitions",
    }),
    toStatus: one(lotTypeStatusDefinition, {
      fields: [lotTypeStatusTransition.toStatusId],
      references: [lotTypeStatusDefinition.id],
      relationName: "toTransitions",
    }),
  }),
);
