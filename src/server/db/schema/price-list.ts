import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { lotType, lotTypeVariant } from "./lot-types";

export const priceList = pgTable(
  "price_list",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id),
    name: text().notNull(),
    description: text(),
    currency: text().notNull().default("CAD"),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("uq_price_list_org_name").on(t.orgId, t.name)],
);

export type PriceList = typeof priceList.$inferSelect;

export const priceListEntry = pgTable(
  "price_list_entry",
  {
    id: uuid().primaryKey().defaultRandom(),
    priceListId: uuid("price_list_id")
      .notNull()
      .references(() => priceList.id, { onDelete: "cascade" }),
    lotTypeId: uuid("lot_type_id")
      .notNull()
      .references(() => lotType.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => lotTypeVariant.id, {
      onDelete: "set null",
    }),
    unitPrice: integer("unit_price").notNull(),
    minQty: numeric("min_qty"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_price_list_entry_list_type_variant").on(
      t.priceListId,
      t.lotTypeId,
      t.variantId,
    ),
  ],
);

export type PriceListEntry = typeof priceListEntry.$inferSelect;
