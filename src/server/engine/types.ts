import type { db as dbInstance } from "~/server/db";

export type Tx = Parameters<
  Parameters<(typeof dbInstance)["transaction"]>[0]
>[0];
