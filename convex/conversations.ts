import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireViewer } from "./utils";

export const listMine = query({
  args: {},
  handler: async (ctx: any) => {
    const me = await requireViewer(ctx);
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("byUser", (q: any) => q.eq("userId", me._id))
      .collect();
    const conversationIds = memberships.map((m: any) => m.conversationId);
    const conversations = await Promise.all(
      conversationIds.map((id: string) => ctx.db.get(id))
    );
    return conversations.filter(Boolean);
  },
});

export const createDirect = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    const now = Date.now();
    const convo = await ctx.db.insert("conversations", {
      kind: "direct",
      createdBy: me._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId: convo,
      userId: me._id,
      role: "admin",
      joinedAt: now,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId: convo,
      userId: args.otherUserId,
      role: "member",
      joinedAt: now,
    });
    return convo;
  },
});

export const createGroup = mutation({
  args: {
    title: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    const now = Date.now();
    const convo = await ctx.db.insert("conversations", {
      kind: "group",
      title: args.title,
      createdBy: me._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId: convo,
      userId: me._id,
      role: "admin",
      joinedAt: now,
    });
    for (const uid of args.memberIds as string[]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: convo,
        userId: uid,
        role: "member",
        joinedAt: now,
      });
    }
    return convo;
  },
});

export const listUpdatedSince = query({
  args: { since: v.number() },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    // Find my conversation ids
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("byUser", (q: any) => q.eq("userId", me._id))
      .collect();
    const convoIds = new Set(memberships.map((m: any) => m.conversationId));
    const results: any[] = [];
    // Iterate my conversations; fetch and filter by updatedAt > since
    for (const id of convoIds) {
      const c = await ctx.db.get(id);
      if (c && c.updatedAt > args.since) results.push(c);
    }
    // Sort by updatedAt desc
    results.sort((a, b) => b.updatedAt - a.updatedAt);
    return results;
  },
});

export const addMember = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.kind !== "group") throw new Error("Not a group");
    const myMembership = await ctx.db
      .query("conversationMembers")
      .withIndex("byConversation", (q: any) => q.eq("conversationId", args.conversationId))
      .filter((q: any) => q.eq(q.field("userId"), me._id))
      .unique();
    if (!myMembership || myMembership.role !== "admin") throw new Error("Forbidden");
    const now = Date.now();
    await ctx.db.insert("conversationMembers", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: "member",
      joinedAt: now,
    });
  },
});

export const removeMember = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    const me = await requireViewer(ctx);
    const myMembership = await ctx.db
      .query("conversationMembers")
      .withIndex("byConversation", (q: any) => q.eq("conversationId", args.conversationId))
      .filter((q: any) => q.eq(q.field("userId"), me._id))
      .unique();
    if (!myMembership || myMembership.role !== "admin") throw new Error("Forbidden");
    const target = await ctx.db
      .query("conversationMembers")
      .withIndex("byConversation", (q: any) => q.eq("conversationId", args.conversationId))
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .unique();
    if (target) await ctx.db.delete(target._id);
  },
});


