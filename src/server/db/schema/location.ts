import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

// ---------------------------------------------------------------------------
// Location type — org-level lookup for location.typeId
// ---------------------------------------------------------------------------

export const locationType = pgTable(
  "location_type",
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
    uniqueIndex("uq_location_type_org_name").on(t.orgId, t.name),
    index("idx_location_type_org").on(t.orgId),
  ],
);

export type LocationType = typeof locationType.$inferSelect;

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export const location = pgTable(
  "location",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id),
    name: text().notNull(),
    description: text(),
    typeId: uuid("type_id").references(() => locationType.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    parentId: uuid("parent_id").references((): AnyPgColumn => location.id, {
      onDelete: "cascade",
    }),
  },
  (t) => [
    uniqueIndex("uq_location_org_name_parent").on(t.orgId, t.name, t.parentId),
    index("idx_location_org").on(t.orgId),
  ],
);

export type Location = typeof location.$inferSelect;

export const locationTypeRelations = relations(
  locationType,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [locationType.orgId],
      references: [organization.id],
    }),
    locations: many(location),
  }),
);

export const locationsRelations = relations(location, ({ one, many }) => ({
  organization: one(organization, {
    fields: [location.orgId],
    references: [organization.id],
  }),
  type: one(locationType, {
    fields: [location.typeId],
    references: [locationType.id],
  }),
  parent: one(location, {
    fields: [location.parentId],
    references: [location.id],
    relationName: "parentChild",
  }),
  children: many(location, { relationName: "parentChild" }),
}));
