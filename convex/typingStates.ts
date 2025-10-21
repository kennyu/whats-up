import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireViewer } from "./utils";

export const findMine = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    return await ctx.db
      .query("typingStates")
      .withIndex("byConversation", (q: any) => q.eq("conversationId", args.conversationId))
      .filter((q: any) => q.eq(q.field("userId"), me._id))
      .unique();
  },
});

export const create = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    startedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    return await ctx.db.insert("typingStates", {
      conversationId: args.conversationId,
      userId: me._id,
      startedAt: args.startedAt,
      expiresAt: args.expiresAt,
    });
  },
});

export const update = internalMutation({
  args: { id: v.id("typingStates"), startedAt: v.number(), expiresAt: v.number() },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.id, { startedAt: args.startedAt, expiresAt: args.expiresAt });
  },
});


