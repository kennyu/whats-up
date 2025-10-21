import { index, sqliteTable, text, integer, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";

// conversations_local
export const conversationsLocal = sqliteTable(
  "conversations_local",
  {
    id: text("id").primaryKey(), // Convex conversation id
    kind: text("kind").notNull(), // "direct" | "group"
    title: text("title"),
    createdBy: text("created_by").notNull(),
    avatarUrl: text("avatar_url"),
    lastMessageId: text("last_message_id"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    muted: integer("muted", { mode: "boolean" }).default(false),
    archived: integer("archived", { mode: "boolean" }).default(false),
  },
  (table) => ({
    byUpdatedAt: index("conversations_local_by_updated_at").on(table.updatedAt),
  })
);

// conversation_members_local
export const conversationMembersLocal = sqliteTable(
  "conversation_members_local",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // "admin" | "member"
    joinedAt: integer("joined_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    byConversation: index("members_local_by_conversation").on(table.conversationId),
    byUser: index("members_local_by_user").on(table.userId),
  })
);

// messages_local
export const messagesLocal = sqliteTable(
  "messages_local",
  {
    id: text("id").primaryKey(), // Convex message id (or temp until server ack)
    clientId: text("client_id"), // local UUID for outbox reconciliation
    conversationId: text("conversation_id").notNull(),
    senderId: text("sender_id").notNull(),
    text: text("text"),
    type: text("type").notNull(), // "text" | "image" | "system"
    replyToMessageId: text("reply_to_message_id"),
    status: text("status").notNull(), // "pending" | "sent" | "delivered" | "read"
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    editedAt: integer("edited_at", { mode: "number" }),
    deletedAt: integer("deleted_at", { mode: "number" }),
    attachmentsCount: integer("attachments_count", { mode: "number" }).default(0),
    reactionsCount: integer("reactions_count", { mode: "number" }).default(0),
  },
  (table) => ({
    byConvCreatedAt: index("messages_local_by_conv_created_at").on(
      table.conversationId,
      table.createdAt
    ),
    byReplyTo: index("messages_local_by_reply_to").on(table.replyToMessageId),
    bySender: index("messages_local_by_sender").on(table.senderId),
    byStatus: index("messages_local_by_status").on(table.status),
  })
);

// attachments_local
export const attachmentsLocal = sqliteTable(
  "attachments_local",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").notNull(),
    uri: text("uri").notNull(), // file:// or https://
    storageId: text("storage_id"),
    mimeType: text("mime_type").notNull(),
    width: integer("width", { mode: "number" }),
    height: integer("height", { mode: "number" }),
    sizeBytes: integer("size_bytes", { mode: "number" }),
    uploadStatus: text("upload_status").notNull(), // "local" | "uploading" | "uploaded" | "failed"
  },
  (table) => ({
    byMessage: index("attachments_local_by_message").on(table.messageId),
  })
);

// reactions_local
export const reactionsLocal = sqliteTable(
  "reactions_local",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").notNull(),
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    byMessage: index("reactions_local_by_message").on(table.messageId),
    uniqueByUserEmoji: uniqueIndex("reactions_local_unique_msg_user_emoji").on(
      table.messageId,
      table.userId,
      table.emoji
    ),
  })
);

// read_receipts_local (latest per user+conversation)
export const readReceiptsLocal = sqliteTable(
  "read_receipts_local",
  {
    conversationId: text("conversation_id").notNull(),
    userId: text("user_id").notNull(),
    messageId: text("message_id").notNull(),
    readAt: integer("read_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.conversationId] }),
  })
);

// sync_state
export const syncState = sqliteTable(
  "sync_state",
  {
    key: text("key").primaryKey(), // e.g., "conv:{id}"
    lastCursor: text("last_cursor"),
    lastSyncedAt: integer("last_synced_at", { mode: "number" }),
  }
);

// outbox
export const outbox = sqliteTable(
  "outbox",
  {
    clientId: text("client_id").primaryKey(), // local UUID
    kind: text("kind").notNull(), // "message" | "reaction" | "receipt" | "attachment" | "conversation"
    payload: text("payload").notNull(), // JSON string
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    attemptCount: integer("attempt_count", { mode: "number" }).default(0),
    lastAttemptAt: integer("last_attempt_at", { mode: "number" }),
    error: text("error"),
    parentClientId: text("parent_client_id"), // for dependency ordering (children wait on parent)
  },
  (table) => ({
    byCreatedAt: index("outbox_by_created_at").on(table.createdAt),
    byAttempts: index("outbox_by_attempts").on(table.attemptCount),
  })
);


