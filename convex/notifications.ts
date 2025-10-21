import { action, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireViewer } from "./utils";

export const registerToken = mutation({
  args: { token: v.string(), platform: v.union(v.literal("ios"), v.literal("android")) },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    const existing = await ctx.db
      .query("notificationTokens")
      .withIndex("byUser", (q: any) => q.eq("userId", me._id))
      .filter((q: any) => q.eq(q.field("token"), args.token))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { platform: args.platform, revokedAt: undefined });
      return existing._id;
    }
    return await ctx.db.insert("notificationTokens", {
      userId: me._id,
      token: args.token,
      platform: args.platform,
      createdAt: now,
    });
  },
});

export const fanOutNewMessage = action({
  args: { conversationId: v.id("conversations"), senderId: v.id("users"), preview: v.string() },
  handler: async (ctx: any, args: any) => {
    // Placeholder: integrate with Expo Notifications / FCM
    // Fetch members except sender and their tokens
    const members = await (ctx as any).runQuery((global as any).internal?.notifications?.members ?? undefined, { conversationId: args.conversationId });
    const targets = (members as any[]).filter((m: any) => m.userId !== args.senderId);
    const tokens = await (ctx as any).runQuery((global as any).internal?.notifications?.tokensForUsers ?? undefined, { userIds: targets.map((m: any) => m.userId) });
    // Call external notification service here
    return { count: tokens.length };
  },
});

export const members = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("conversationMembers")
      .withIndex("byConversation", (q: any) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const tokensForUsers = internalQuery({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx: any, args: any) => {
    const tokens = [] as Array<{ userId: string; token: string; platform: "ios" | "android" }>;
    for (const uid of args.userIds as string[]) {
      const rows = await ctx.db
        .query("notificationTokens")
        .withIndex("byUser", (q: any) => q.eq("userId", uid))
        .collect();
      for (const r of rows) {
        if (!r.revokedAt) tokens.push({ userId: uid, token: r.token, platform: r.platform });
      }
    }
    return tokens;
  },
});


