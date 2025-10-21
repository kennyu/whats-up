import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { assertMember, requireViewer } from "./utils";
import { internal } from "./_generated/api";

export const listByConversation = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // createdAt cursor
  },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    await assertMember(ctx, args.conversationId, me._id);
    const limit = args.limit ?? 50;
    const before = args.before ?? Number.MAX_SAFE_INTEGER;
    const rows = await ctx.db
      .query("messages")
      .withIndex("byConversationCreatedAt", (q: any) =>
        q.eq("conversationId", args.conversationId).lt("createdAt", before)
      )
      .order("desc")
      .take(limit);
    return rows;
  },
});

export const listSince = query({
  args: {
    conversationId: v.id("conversations"),
    since: v.number(), // createdAt cursor (exclusive)
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    await assertMember(ctx, args.conversationId, me._id);
    const limit = args.limit ?? 200;
    const rows = await ctx.db
      .query("messages")
      .withIndex("byConversationCreatedAt", (q: any) =>
        q.eq("conversationId", args.conversationId).gt("createdAt", args.since)
      )
      .order("asc")
      .take(limit);
    return rows;
  },
});

export const sendText = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    replyToMessageId: v.optional(v.id("messages")),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    await assertMember(ctx, args.conversationId, me._id);
    if (args.replyToMessageId) {
      const parent = await ctx.db.get(args.replyToMessageId);
      if (!parent || parent.conversationId !== args.conversationId) {
        throw new Error("Reply must reference a message in the same conversation");
      }
    }
    const now = Date.now();
    const id = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      text: args.text,
      type: "text",
      replyToMessageId: args.replyToMessageId,
      status: "sent",
      createdAt: now,
    });
    await ctx.db.patch(args.conversationId, { updatedAt: now, lastMessageId: id });
    return { id, clientId: args.clientId };
  },
});

export const sendImage = mutation({
  args: {
    conversationId: v.id("conversations"),
    imageUrl: v.string(),
    mimeType: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    sizeBytes: v.optional(v.number()),
    replyToMessageId: v.optional(v.id("messages")),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    await assertMember(ctx, args.conversationId, me._id);
    if (args.replyToMessageId) {
      const parent = await ctx.db.get(args.replyToMessageId);
      if (!parent || parent.conversationId !== args.conversationId) {
        throw new Error("Reply must reference a message in the same conversation");
      }
    }
    const now = Date.now();
    const id = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      type: "image",
      replyToMessageId: args.replyToMessageId,
      status: "sent",
      createdAt: now,
      attachments: [
        {
          url: args.imageUrl,
          mimeType: args.mimeType,
          width: args.width,
          height: args.height,
          sizeBytes: args.sizeBytes,
        },
      ],
    });
    await ctx.db.patch(args.conversationId, { updatedAt: now, lastMessageId: id });
    await ctx.db.insert("attachments", {
      messageId: id,
      url: args.imageUrl,
      mimeType: args.mimeType ?? "image/jpeg",
      width: args.width,
      height: args.height,
      sizeBytes: args.sizeBytes,
      createdAt: now,
    });
    return { id, clientId: args.clientId };
  },
});

export const addReaction = mutation({
  args: { messageId: v.id("messages"), emoji: v.string() },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Not found");
    await assertMember(ctx, msg.conversationId, me._id);
    const existing = await ctx.db
      .query("reactions")
      .withIndex("byMessageUserEmoji", (q: any) =>
        q.eq("messageId", args.messageId).eq("userId", me._id).eq("emoji", args.emoji)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { toggledOff: true };
    }
    await ctx.db.insert("reactions", {
      messageId: args.messageId,
      userId: me._id,
      emoji: args.emoji,
      createdAt: Date.now(),
    });
    return { toggledOff: false };
  },
});

export const reactionsForMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx: any, args: any) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Not found");
    const me = await requireViewer(ctx);
    await assertMember(ctx, msg.conversationId, me._id);
    return await ctx.db
      .query("reactions")
      .withIndex("byMessage", (q: any) => q.eq("messageId", args.messageId))
      .collect();
  },
});

export const upsertReadReceipt = mutation({
  args: { conversationId: v.id("conversations"), messageId: v.id("messages") },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    await assertMember(ctx, args.conversationId, me._id);
    const now = Date.now();
    const existing = await ctx.db
      .query("readReceipts")
      .withIndex("byUserConversation", (q: any) =>
        q.eq("userId", me._id).eq("conversationId", args.conversationId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { messageId: args.messageId, readAt: now });
      return existing._id;
    }
    return await ctx.db.insert("readReceipts", {
      conversationId: args.conversationId,
      userId: me._id,
      messageId: args.messageId,
      readAt: now,
    });
  },
});

export const setTyping = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    await assertMember(ctx, args.conversationId, me._id);
    const now = Date.now();
    const expiresAt = now + 10000; // 10s
    const existing = await (ctx as any).runQuery((global as any).internal?.typingStates?.findMine ?? undefined, {
      conversationId: args.conversationId,
    });
    if (existing) {
      await (ctx as any).runMutation((global as any).internal?.typingStates?.update ?? undefined, {
        id: existing._id,
        startedAt: now,
        expiresAt,
      });
    } else {
      await (ctx as any).runMutation((global as any).internal?.typingStates?.create ?? undefined, {
        conversationId: args.conversationId,
        startedAt: now,
        expiresAt,
      });
    }
  },
});


