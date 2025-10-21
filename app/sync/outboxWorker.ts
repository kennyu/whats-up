import { outbox, messagesLocal, readReceiptsLocal, reactionsLocal } from "../../localdb/schema";
import { asc, eq } from "drizzle-orm";
import { api } from "../../convex/_generated/api";
import { ConvexReactClient } from "convex/react";

type Kind = "message" | "reaction" | "receipt";

export async function flushOutbox(db: any, client: ConvexReactClient) {
  const rows = await db.select().from(outbox).orderBy(asc(outbox.createdAt));
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload as string);
      if (row.kind === ("message" as Kind)) {
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


