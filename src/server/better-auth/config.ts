import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  organization,
  lastLoginMethod,
  testUtils,
} from "better-auth/plugins";

import { db } from "~/server/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [admin(), organization(), lastLoginMethod(), testUtils()],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});

export type Session = typeof auth.$Infer.Session;
