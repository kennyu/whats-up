import { db } from "./db";
import { outbox, syncState, messagesLocal, conversationsLocal, readReceiptsLocal } from "./schema";
import { eq, and, desc } from "drizzle-orm";
import { generateClientId } from "../app/utils/id";

export async function enqueue(kind: string, payload: unknown) {
  const clientId = generateClientId();
  const createdAt = Date.now();
  await db.insert(outbox).values({ clientId, kind, payload: JSON.stringify(payload), createdAt });
  return clientId;
}

export async function pruneConversation(conversationId: string, keep: number = 200) {
  const rows = await db
    .select({ id: messagesLocal.id })
    .from(messagesLocal)
    .where(eq(messagesLocal.conversationId, conversationId))
    .orderBy(desc(messagesLocal.createdAt));
  if (rows.length <= keep) return;
  const toDelete = rows.slice(keep);
  for (const r of toDelete) {
    await db.delete(messagesLocal).where(eq(messagesLocal.id, r.id));
  }
}

export async function updateSyncCursor(key: string, cursor: string) {
  const existing = await db.select().from(syncState).where(eq(syncState.key, key));
  if (existing.length > 0) {
    await db.update(syncState).set({ lastCursor: cursor, lastSyncedAt: Date.now() }).where(eq(syncState.key, key));
  } else {
    await db.insert(syncState).values({ key, lastCursor: cursor, lastSyncedAt: Date.now() });
  }
}


