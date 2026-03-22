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
import { lotTypeStatusDefinition } from "./lot-type-status";
import { relations } from "drizzle-orm/relations";

export const lotType = pgTable(
  "lot_type",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    description: text(),
    category: text().notNull(),
    quantityName: text("quantity_name"),
    quantityDefaultUnit: text("default_unit").notNull().default("each"),
    icon: text(),
    color: text(),
    codePrefix: text("code_prefix"),
    codeNextNumber: integer("code_next_number").notNull().default(1),
  },
  (t) => [uniqueIndex().on(t.codePrefix)],
);

export const lotTypeRelations = relations(lotType, ({ many }) => ({
  statusDefinitions: many(lotTypeStatusDefinition),
}));

export type LotType = typeof lotType.$inferSelect;

export const lotTypeOption = pgTable(
  "lot_type_option",
  {
    id: uuid().primaryKey().defaultRandom(),
    lotTypeId: uuid("lot_type_id")
      .notNull()
      .references(() => lotType.id, { onDelete: "cascade" }),
    name: text().notNull(),
    position: integer().notNull(),
  },
  (t) => [
    uniqueIndex("uq_lot_type_option_name").on(t.lotTypeId, t.name),
    uniqueIndex("uq_lot_type_option_position").on(t.lotTypeId, t.position),
  ],
);

export const lotTypeOptionValue = pgTable(
  "lot_type_option_value",
  {
    id: uuid().primaryKey().defaultRandom(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => lotTypeOption.id, { onDelete: "cascade" }),
    value: text().notNull(),
    position: integer().notNull(),
  },
  (t) => [uniqueIndex("uq_option_value").on(t.optionId, t.value)],
);

export const lotTypeVariant = pgTable("lot_type_variant", {
  id: uuid().primaryKey().defaultRandom(),
  lotTypeId: uuid("lot_type_id")
    .notNull()
    .references(() => lotType.id, { onDelete: "cascade" }),
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

export const lotTypeVariantOptionValue = pgTable(
  "lot_type_variant_option_value",
  {
    id: uuid().primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => lotTypeVariant.id, { onDelete: "cascade" }),
    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => lotTypeOptionValue.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("uq_variant_option_value").on(t.variantId, t.optionValueId),
  ],
);

export const lotTypeIdentifier = pgTable(
  "lot_type_identifier",
  {
    id: uuid().primaryKey().defaultRandom(),
    lotTypeId: uuid("lot_type_id")
      .notNull()
      .references(() => lotType.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => lotTypeVariant.id, {
      onDelete: "set null",
    }),
    identifierType: text("identifier_type").notNull(),
    identifierValue: text("identifier_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex().on(t.identifierType, t.identifierValue)],
);

export const lotTypeAttributeDefinition = pgTable(
  "lot_type_attribute_definition",
  {
    id: uuid().primaryKey().defaultRandom(),
    lotTypeId: uuid("lot_type_id")
      .notNull()
      .references(() => lotType.id, { onDelete: "cascade" }),
    attrKey: text("attr_key").notNull(),
    dataType: text("data_type").notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    unit: text(),
    options: jsonb(),
    defaultValue: text("default_value"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex().on(t.lotTypeId, t.attrKey)],
);
