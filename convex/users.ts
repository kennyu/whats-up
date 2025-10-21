import { query } from "./_generated/server";
import { v } from "convex/values";

export const findByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byHandle", (q: any) => q.eq("handle", args.handle))
      .unique();
    return user ?? null;
  },
});


