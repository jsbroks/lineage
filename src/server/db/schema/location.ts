import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const location = pgTable("location", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text(),
  type: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  parentId: uuid("parent_id").references((): AnyPgColumn => location.id, {
    onDelete: "cascade",
  }),
});

export type Location = typeof location.$inferSelect;

export const locationsRelations = relations(location, ({ one, many }) => ({
  // organization: one(organizations, { fields: [locations.orgId], references: [organizations.id] }),
  parent: one(location, {
    fields: [location.parentId],
    references: [location.id],
    relationName: "parentChild",
  }),
  children: many(location, { relationName: "parentChild" }),
  // lots:         many(lots),
}));
