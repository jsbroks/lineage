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

export const itemTemplate = pgTable("item_template", {
  id: uuid().primaryKey().defaultRandom(),
  itemTypeId: uuid("item_type_id")
    .notNull()
    .references(() => itemType.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  defaultAttributes: jsonb("default_attributes").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ItemTemplate = typeof itemTemplate.$inferSelect;

export const itemTypeAttributeDefinition = pgTable(
  "item_type_attribute_definition",
  {
    id: uuid().primaryKey().defaultRandom(),
    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id, { onDelete: "cascade" }),
    attrKey: text("attr_key").notNull(),
    dataType: text("data_type").notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    unit: text(),
    options: jsonb(),
    defaultValue: text("default_value"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex().on(t.itemTypeId, t.attrKey)],
);
