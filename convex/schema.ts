import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table extended to be compatible with Convex Auth requirements
  users: defineTable({
    // App-specific fields (optional so Convex Auth can insert minimal users)
    handle: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.optional(v.number()), // epoch ms
    lastSeenAt: v.optional(v.number()),
    // Fields used by Convex Auth
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("byHandle", ["handle"]) // existing index
    .index("email", ["email"]) // required by Convex Auth
    .index("phone", ["phone"]), // required by Convex Auth

  conversations: defineTable({
    kind: v.union(v.literal("direct"), v.literal("group")),
    title: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdBy: v.id("users"),
    lastMessageId: v.optional(v.id("messages")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("byUpdatedAt", ["updatedAt"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
    muted: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
  })
    .index("byUser", ["userId"])
    .index("byConversation", ["conversationId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    clientId: v.optional(v.string()),
    text: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("system")),
    replyToMessageId: v.optional(v.id("messages")),
    attachments: v.optional(
      v.array(
        v.object({
          storageId: v.optional(v.string()),
          url: v.optional(v.string()),
          mimeType: v.optional(v.string()),
          width: v.optional(v.number()),
          height: v.optional(v.number()),
          sizeBytes: v.optional(v.number()),
        })
      )
    ),
    status: v.union(
      v.literal("sending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read")
    ),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("byConversationCreatedAt", ["conversationId", "createdAt"]) 
    .index("byReplyTo", ["replyToMessageId"]) 
    .index("byClientId", ["clientId"]),

  attachments: defineTable({
    messageId: v.id("messages"),
    storageId: v.optional(v.string()),
    url: v.string(),
    mimeType: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    sizeBytes: v.optional(v.number()),
    createdAt: v.number(),
  }).index("byMessage", ["messageId"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("byMessage", ["messageId"])
    .index("byMessageUserEmoji", ["messageId", "userId", "emoji"]),

  readReceipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    messageId: v.id("messages"),
    readAt: v.number(),
  })
    .index("byUserConversation", ["userId", "conversationId"])
    .index("byConversationUser", ["conversationId", "userId"]),

  typingStates: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    startedAt: v.number(),
    expiresAt: v.number(),
  }).index("byConversation", ["conversationId"]),

  notificationTokens: defineTable({
    userId: v.id("users"),
    platform: v.union(v.literal("ios"), v.literal("android")),
    token: v.string(),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  }).index("byUser", ["userId"]),

  // Convex Auth tables (required)
  authSessions: defineTable({
    userId: v.id("users"),
    expirationTime: v.number(),
  }).index("userId", ["userId"]),

  authAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    secret: v.optional(v.string()),
    emailVerified: v.optional(v.string()),
    phoneVerified: v.optional(v.string()),
  })
    .index("userIdAndProvider", ["userId", "provider"])
    .index("providerAndAccountId", ["provider", "providerAccountId"]),

  authRefreshTokens: defineTable({
    sessionId: v.id("authSessions"),
    expirationTime: v.number(),
    firstUsedTime: v.optional(v.number()),
    parentRefreshTokenId: v.optional(v.id("authRefreshTokens")),
  })
    .index("sessionId", ["sessionId"]) // sort by creationTime implicitly
    .index("sessionIdAndParentRefreshTokenId", [
      "sessionId",
      "parentRefreshTokenId",
    ]),

  authVerificationCodes: defineTable({
    accountId: v.id("authAccounts"),
    provider: v.string(),
    code: v.string(),
    expirationTime: v.number(),
    verifier: v.optional(v.string()),
    emailVerified: v.optional(v.string()),
    phoneVerified: v.optional(v.string()),
  })
    .index("accountId", ["accountId"])
    .index("code", ["code"]),

  authVerifiers: defineTable({
    sessionId: v.optional(v.id("authSessions")),
    signature: v.optional(v.string()),
  }).index("signature", ["signature"]),

  authRateLimits: defineTable({
    identifier: v.string(),
    lastAttemptTime: v.number(),
    attemptsLeft: v.number(),
  }).index("identifier", ["identifier"]),
});


