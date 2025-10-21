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

// Quick seed for first-run demo: one conversation and one message
(async () => {
  try {
    const existing = await db.select().from(schema.conversationsLocal).limit(1);
    if (existing.length === 0) {
      const now = Date.now();
      await db.insert(schema.conversationsLocal).values({
        id: "demo-conv-1",
        kind: "group",
        title: "Demo Chat",
        createdBy: "seed-user",
        createdAt: now,
        updatedAt: now,
        muted: 0,
        archived: 0,
      } as any);
      await db.insert(schema.messagesLocal).values({
        id: "demo-msg-1",
        clientId: "",
        conversationId: "demo-conv-1",
        senderId: "seed-user",
        text: "Welcome to Whats Up!",
        type: "text",
        status: "sent",
        createdAt: now,
      } as any);
    }
  } catch (e) {
    console.warn("SQLite seed failed:", e);
  }
})();


