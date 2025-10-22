import { outbox, messagesLocal, readReceiptsLocal, reactionsLocal, conversationsLocal, pendingConversationTargets } from "../../localdb/schema";
import { asc, eq, and } from "drizzle-orm";
import { api } from "../../convex/_generated/api";
import { ConvexReactClient } from "convex/react";

type Kind = "message" | "reaction" | "receipt" | "conversation";

export async function flushOutbox(db: any, client: ConvexReactClient) {
  const rows = await db.select().from(outbox).orderBy(asc(outbox.createdAt));
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload as string);
      if (row.kind === ("conversation" as Kind)) {
        // Rebuild args from local tables
        const tempId = row.clientId;
        const convRows = await db.select().from(conversationsLocal).where(eq(conversationsLocal.id, tempId));
        if (!convRows.length) throw new Error("Temp conversation row missing");
        const conv = convRows[0];
        const targetHandlesRows = await db
          .select()
          .from(pendingConversationTargets)
          .where(eq(pendingConversationTargets.conversationId, tempId));
        const handles: string[] = targetHandlesRows.map((r: any) => r.handle);
        let serverConversationId: string | undefined;
        if (conv.kind === 'group') {
          const memberIds: string[] = [];
          for (const h of handles) {
            try {
              const u = await client.query(api.users.findByHandle, { handle: h });
              if (u && u._id) memberIds.push(u._id);
            } catch {}
          }
          serverConversationId = await client.mutation(api.conversations.createGroup, { title: conv.title ?? 'Group', memberIds });
        } else {
          if (handles.length === 1) {
            let otherUserId: string | undefined;
            try {
              const u = await client.query(api.users.findByHandle, { handle: handles[0] });
              if (u && u._id) otherUserId = u._id;
            } catch {}
            if (otherUserId) serverConversationId = await client.mutation(api.conversations.createDirect, { otherUserId });
          }
        }
        if (serverConversationId) {
          // Reconcile local temp conversation id to server id by mutating PK
          const tempId = row.clientId;
          await db
            .update(conversationsLocal)
            .set({ id: serverConversationId })
            .where(eq(conversationsLocal.id, tempId));
          // Retarget any local messages referencing temp conversation id
          await db
            .update(messagesLocal)
            .set({ conversationId: serverConversationId })
            .where(eq(messagesLocal.conversationId, tempId));
          // Retarget queued children in outbox where parentClientId === tempId
          const childRows = await db.select().from(outbox).where(eq(outbox.parentClientId, tempId));
          for (const child of childRows) {
            const childPayload = JSON.parse(child.payload as string);
            if (childPayload.conversationId === tempId) childPayload.conversationId = serverConversationId;
            const newPayload = JSON.stringify(childPayload);
            await db
              .update(outbox)
              .set({ payload: newPayload, parentClientId: null })
              .where(eq(outbox.clientId, child.clientId));
            // Also update the in-memory row so it can be processed in this pass
            const match = (rows as any[]).find((r: any) => r.clientId === child.clientId);
            if (match) {
              (match as any).payload = newPayload;
              (match as any).parentClientId = null;
            }
          }
        } else {
          // Could not resolve yet (e.g., unknown handles) → retry later
          throw new Error("Conversation creation prerequisites not satisfied yet");
        }
      } else if (row.kind === ("message" as Kind)) {
        // If this message depends on a temp parent conversation, wait until reconciled
        if (
          row.parentClientId &&
          typeof payload.conversationId === "string" &&
          payload.conversationId.startsWith("temp-")
        ) {
          // Skip for now; parent handler will retarget this row
          continue;
        }
        const res = await client.mutation(api.messages.sendText, payload);
        if (payload.clientId) {
          // reconcile local message id if needed
          await db
            .update(messagesLocal)
            .set({ id: res.id, status: "sent" })
            .where(eq(messagesLocal.clientId, payload.clientId));
        }
      } else if (row.kind === ("reaction" as Kind)) {
        await client.mutation(api.messages.addReaction, payload);
        // optional: upsert local reaction row
      } else if (row.kind === ("receipt" as Kind)) {
        await client.mutation(api.messages.upsertReadReceipt, payload);
        // local read receipt already latest
      }
      await db.delete(outbox).where(eq(outbox.clientId, row.clientId));
    } catch (err) {
      // Always log errors for visibility; leave row for next cycle / retry.
      console.error('[outbox] flush error', {
        kind: (row as any).kind,
        clientId: (row as any).clientId,
        payload: (row as any).payload,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}


