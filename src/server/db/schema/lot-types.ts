import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { lotTypeStatusDefinition } from "./lot-type-status";
import { relations } from "drizzle-orm/relations";
import { organization } from "./auth";
import { location } from "./location";

// ---------------------------------------------------------------------------
// Lot type category — org-level lookup for lotType.categoryId
// ---------------------------------------------------------------------------

export const lotTypeCategory = pgTable(
  "lot_type_category",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id),
    name: text().notNull(),
    description: text(),
    color: text(),
    icon: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_lot_type_category_org_name").on(t.orgId, t.name),
    index("idx_lot_type_category_org").on(t.orgId),
  ],
);

export type LotTypeCategory = typeof lotTypeCategory.$inferSelect;

export const lotTypeCategoryRelations = relations(
  lotTypeCategory,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [lotTypeCategory.orgId],
      references: [organization.id],
    }),
    lotTypes: many(lotType),
  }),
);

// ---------------------------------------------------------------------------
// Lot type
// ---------------------------------------------------------------------------

export const trackingType = pgEnum("tracking_type", ["standard", "serialized"]);

export const lotType = pgTable(
  "lot_type",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id),

    name: text().notNull(),
    description: text(),

    categoryId: uuid("category_id").references(() => lotTypeCategory.id, {
      onDelete: "set null",
    }),

    trackingType: trackingType("tracking_type").notNull(),

    canBuy: boolean("can_buy").notNull().default(false),
    canMake: boolean("can_make").notNull().default(false),
    canSell: boolean("can_sell").notNull().default(false),

    defaultLocationId: uuid("default_location_id").references(
      () => location.id,
      { onDelete: "set null" },
    ),

    defaultMinimumStockLevel: integer("default_minimum_stock_level")
      .notNull()
      .default(0),
    defaultUom: text("default_uom").notNull().default("ea"),
    defaultWeightPerUnit: numeric("default_weight_per_unit")
      .notNull()
      .default("1"),
    defaultWeightPerUnitUom: text("default_weight_per_unit_uom")
      .notNull()
      .default("g"),

    defaultCurrency: text("default_currency"),
    defaultUnitSellPrice: integer("default_unit_sell_price")
      .notNull()
      .default(0),
    defaultUnitPurchasePrice: integer("default_unit_purchase_price")
      .notNull()
      .default(0),

    icon: text(),
    color: text(),

    defaultSku: text("default_sku"),

    codePrefix: text("code_prefix"),
    codeNextNumber: integer("code_next_number").notNull().default(1),
  },
  (t) => [
    uniqueIndex("uq_lot_type_org_code_prefix").on(t.orgId, t.codePrefix),
    uniqueIndex("uq_lot_type_org_name").on(t.orgId, t.name),
    index("idx_lot_type_org").on(t.orgId),
  ],
);

export const lotTypeRelations = relations(lotType, ({ one, many }) => ({
  organization: one(organization, {
    fields: [lotType.orgId],
    references: [organization.id],
  }),
  category: one(lotTypeCategory, {
    fields: [lotType.categoryId],
    references: [lotTypeCategory.id],
  }),
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

  sku: text(),
  isActive: boolean("is_active").notNull().default(true),

  unitSellPrice: integer("unit_sell_price"),
  unitPurchasePrice: integer("unit_purchase_price"),
  weightPerUnit: numeric("weight_per_unit"),
  weightPerUnitUom: text("weight_per_unit_uom"),
  minimumStockLevel: integer("minimum_stock_level"),
  uom: text(),

  locationId: uuid("location_id").references(() => location.id, {
    onDelete: "set null",
  }),

  attributes: jsonb("attributes"),

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
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id),
    variantId: uuid("variant_id").references(() => lotTypeVariant.id, {
      onDelete: "set null",
    }),
    identifierType: text("identifier_type").notNull(),
    identifierValue: text("identifier_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_lot_type_identifier_org_type_value").on(
      t.orgId,
      t.identifierType,
      t.identifierValue,
    ),
  ],
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
