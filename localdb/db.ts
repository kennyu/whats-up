import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";
import { applyMigrations } from "../drizzle/migrations";

// Use sync API available in your expo-sqlite version
export const expoDb = openDatabaseSync("app.db");
// Apply migrations to create/update all tables consistently and export readiness
export const dbReady: Promise<void> = applyMigrations(expoDb).catch((e) => {
  console.warn('applyMigrations error:', e);
});
export const db = drizzle(expoDb, { schema });

