import {
  boolean,
  integer,
  jsonb,
  numeric,
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
  quantityName: text("quantity_name"),
  quantityDefaultUnit: text("default_unit").notNull().default("each"),
  icon: text(),
  color: text(),
  codePrefix: text("code_prefix"),
  codeNextNumber: integer("code_next_number").notNull().default(1),
});

export type ItemType = typeof itemType.$inferSelect;

export const itemTypeOption = pgTable(
  "item_type_option",
  {
    id: uuid().primaryKey().defaultRandom(),
    itemTypeId: uuid("item_type_id")
      .notNull()
      .references(() => itemType.id, { onDelete: "cascade" }),
    name: text().notNull(),
    position: integer().notNull(),
  },
  (t) => [
    uniqueIndex("uq_item_type_option_name").on(t.itemTypeId, t.name),
    uniqueIndex("uq_item_type_option_position").on(t.itemTypeId, t.position),
  ],
);

export const itemTypeOptionValue = pgTable(
  "item_type_option_value",
  {
    id: uuid().primaryKey().defaultRandom(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => itemTypeOption.id, { onDelete: "cascade" }),
    value: text().notNull(),
    position: integer().notNull(),
  },
  (t) => [uniqueIndex("uq_option_value").on(t.optionId, t.value)],
);

export const itemTypeVariant = pgTable("item_type_variant", {
  id: uuid().primaryKey().defaultRandom(),
  itemTypeId: uuid("item_type_id")
    .notNull()
    .references(() => itemType.id, { onDelete: "cascade" }),
  name: text().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  defaultValue: integer("default_value"),
  defaultValueCurrency: text("default_value_currency"),
  defaultQuantity: numeric("default_quantity"),
  defaultQuantityUnit: text("default_quantity_unit"),
  defaultAttributes: jsonb("default_attributes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const itemTypeVariantOptionValue = pgTable(
  "item_type_variant_option_value",
  {
    id: uuid().primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => itemTypeVariant.id, { onDelete: "cascade" }),
    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => itemTypeOptionValue.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("uq_variant_option_value").on(t.variantId, t.optionValueId),
  ],
);

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
