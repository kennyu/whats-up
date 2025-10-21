import { v } from "convex/values";
type QueryCtx = any;
type MutationCtx = any;
type ActionCtx = any;

export const IdValidators = {
  conversationId: v.id("conversations"),
  messageId: v.id("messages"),
  userId: v.id("users"),
};

export async function getViewer(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  let handle: string | null = null;
  if (identity) {
    handle = (identity as any).tokenIdentifier ?? (identity as any).email ?? (identity as any).subject ?? null;
  }
  // Dev/MVP fallback: use a seeded local handle when no auth is configured
  if (!handle) {
    handle = "seed-user";
  }
  let user = await ctx.db
    .query("users")
    .withIndex("byHandle", (q: any) => q.eq("handle", handle))
    .unique();
  if (!user) {
    const now = Date.now();
    const id = await ctx.db.insert("users", {
      handle,
      displayName: handle,
      createdAt: now,
      lastSeenAt: now,
    } as any);
    user = (await ctx.db.get(id)) as any;
  }
  return user;
}

export async function requireViewer(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await getViewer(ctx);
  return user as any;
}

export async function assertMember(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  conversationId: string,
  userId: string
) {
  const membership = await ctx.db
    .query("conversationMembers")
    .withIndex("byConversation", (q: any) => q.eq("conversationId", conversationId))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .unique();
  if (!membership) throw new Error("Forbidden: not a member");
  return membership;
}


