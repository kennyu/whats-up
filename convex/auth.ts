import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Allow running without auth for MVP; return null instead of throwing
      return null;
    }
    const handle = identity.tokenIdentifier ?? identity.email ?? identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("byHandle", (q: any) => q.eq("handle", handle))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: now });
      return existing._id;
    }
    const id = await ctx.db.insert("users", {
      handle,
      displayName: identity.name ?? handle,
      avatarUrl: identity.pictureUrl ?? undefined,
      createdAt: now,
      lastSeenAt: now,
    });
    return id;
  },
});

export const me = query({
  args: {},
  handler: async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const handle = identity.tokenIdentifier ?? identity.email ?? identity.subject;
    return await ctx.db
      .query("users")
      .withIndex("byHandle", (q: any) => q.eq("handle", handle))
      .unique();
  },
});


