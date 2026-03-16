import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const itemType = pgTable("item_type", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull(),
  name: text().notNull(),
  description: text(),
  category: text().notNull(),
  defaultUom: text("default_uom").notNull().default("each"),
  icon: text(),
  color: text(),
  config: jsonb().notNull().default({}),
});

export type ItemType = typeof itemType.$inferSelect;
