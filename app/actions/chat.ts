import { db } from "../../localdb/db";
import { messagesLocal, outbox } from "../../localdb/schema";
import { enqueue } from "../../localdb/sync";
import { generateClientId } from "../utils/id";

export async function sendTextLocal(conversationId: string, text: string, userId: string) {
  const clientId = generateClientId();
  const createdAt = Date.now();
  await db.insert(messagesLocal).values({
    id: clientId, // temp id until server ack
    clientId,
    conversationId,
    senderId: userId,
    text,
    type: 'text',
    status: 'pending',
    createdAt,
  });
  // If conversation not reconciled yet, link this message to its parent conversation create via parentClientId
  if (typeof conversationId === 'string' && conversationId.startsWith('temp-')) {
    await db.insert(outbox).values({
      clientId,
      kind: 'message',
      payload: JSON.stringify({ conversationId, text, clientId }),
      createdAt,
      parentClientId: conversationId,
    });
  } else {
    await enqueue('message', { conversationId, text, clientId });
  }
}


