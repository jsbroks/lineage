import { env } from "./env";

const dbMigrations = async () => {
  console.log("* Running db migration script...");
};

const typesenseMigrations = async () => {
  console.log("* Running typesense migration script...");
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("* Registering instrumentation...");
    if (env.NODE_ENV === "production") await dbMigrations();
    if (env.NODE_ENV === "production") await typesenseMigrations();
  }
}
