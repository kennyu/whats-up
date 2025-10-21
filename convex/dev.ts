import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedCreateGroup = mutation({
  args: { title: v.string() },
  handler: async (ctx: any, args: any) => {
    const now = Date.now();

    // Create or reuse a seed user
    const handle = "seed-user";
    let user = await ctx.db
      .query("users")
      .withIndex("byHandle", (q: any) => q.eq("handle", handle))
      .unique();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        handle,
        displayName: "Seed User",
        createdAt: now,
        lastSeenAt: now,
      });
      user = await ctx.db.get(userId)!;
    }

    // Create a real conversation on the server
    const conversationId = await ctx.db.insert("conversations", {
      kind: "group",
      title: args.title,
      createdBy: user!._id,
      createdAt: now,
      updatedAt: now,
    });

    // Add the seed user as admin member
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: user!._id,
      role: "admin",
      joinedAt: now,
    });

    return { conversationId, userId: user!._id };
  },
});


