import * as Sentry from "@sentry/nextjs";
import { env } from "./env";

const dbMigrations = async () => {
  console.log("* Running db migration script...");
};

const typesenseMigrations = async () => {
  console.log("* Running typesense migration script...");
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    console.log("* Registering instrumentation...");
    if (env.NODE_ENV === "production") await dbMigrations();
    if (env.NODE_ENV === "production") await typesenseMigrations();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
