import {
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { operationType } from "./operation-types";
import { location } from "./location";

export const operation = pgTable(
  "operation",
  {
    id: uuid().primaryKey().defaultRandom(),
    // orgId:           uuid("org_id").notNull().references(() => organizations.id),
    operationTypeId: uuid("operation_type_id")
      .notNull()
      .references(() => operationType.id, { onDelete: "cascade" }),
    status: text().notNull().default("completed"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
    performedBy: uuid("performed_by").references(() => user.id),
    locationId: uuid("location_id").references(() => location.id),
    notes: text(),
    attributes: jsonb().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // index("idx_operations_org").on(t.orgId),
    // index("idx_operations_type").on(t.operationTypeId),
    // index("idx_operations_completed").on(t.orgId, t.completedAt),
  ],
);
export type Operation = typeof operation.$inferSelect;
