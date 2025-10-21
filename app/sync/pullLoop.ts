import { db } from "../../localdb/db";
import { messagesLocal, conversationsLocal, syncState } from "../../localdb/schema";
import { eq } from "drizzle-orm";
import { api } from "../../convex/_generated/api";
import { ConvexReactClient } from "convex/react";

export async function pullConversation(client: ConvexReactClient, conversationId: string) {
  const key = `conv:${conversationId}`;
  const existing = await db.select().from(syncState).where(eq(syncState.key, key));
  const since = existing.length ? Number(existing[0].lastCursor ?? 0) : 0;
  const rows = await client.query(api.messages.listSince, { conversationId, since });
  if (!rows.length) return;
  for (const r of rows) {
    await db
      .insert(messagesLocal)
      .values({
        id: r._id,
        conversationId: r.conversationId,
        senderId: r.senderId,
        text: r.text,
        type: r.type as any,
        replyToMessageId: r.replyToMessageId ?? undefined,
        status: (r as any).status ?? "sent",
        createdAt: r.createdAt,
        editedAt: r.editedAt ?? undefined,
        deletedAt: r.deletedAt ?? undefined,
      })
      .onConflictDoUpdate({
        target: messagesLocal.id,
        set: {
          text: r.text,
          status: (r as any).status ?? "sent",
          editedAt: r.editedAt ?? undefined,
          deletedAt: r.deletedAt ?? undefined,
        },
      });
  }
  const latest = rows[rows.length - 1].createdAt;
  await db
    .insert(syncState)
    .values({ key, lastCursor: String(latest), lastSyncedAt: Date.now() })
    .onConflictDoUpdate({ target: syncState.key, set: { lastCursor: String(latest), lastSyncedAt: Date.now() } });
}

export async function pullConversations(client: ConvexReactClient) {
  const key = `conversations:list`;
  const existing = await db.select().from(syncState).where(eq(syncState.key, key));
  const since = existing.length ? Number(existing[0].lastCursor ?? 0) : 0;
  const rows = await client.query(api.conversations.listUpdatedSince, { since });
  if (!rows.length) return;
  for (const c of rows) {
    await db
      .insert(conversationsLocal)
      .values({
        id: c._id,
        kind: c.kind,
        title: c.title ?? null,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        muted: 0,
        archived: 0,
      } as any)
      .onConflictDoUpdate({ target: conversationsLocal.id, set: { title: c.title ?? null, updatedAt: c.updatedAt } });
  }
  const latest = rows[0].updatedAt; // rows sorted desc
  await db
    .insert(syncState)
    .values({ key, lastCursor: String(latest), lastSyncedAt: Date.now() })
    .onConflictDoUpdate({ target: syncState.key, set: { lastCursor: String(latest), lastSyncedAt: Date.now() } });
}


