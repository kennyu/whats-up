import { query, mutation } from "./_generated/server";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx: any) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    if (!userId) return null;
    const existing = await ctx.db.get(userId);
    if (existing) {
      await ctx.db.patch(userId, { lastSeenAt: now });
      return userId;
    }
    // If for some reason the user doc doesn't exist, create a minimal record
    const identity = await ctx.auth.getUserIdentity();
    const handle = identity?.tokenIdentifier ?? identity?.email ?? identity?.subject ?? `user-${now}`;
    await ctx.db.insert("users", {
      _id: userId,
      handle,
      displayName: identity?.name ?? handle,
      avatarUrl: identity?.pictureUrl ?? undefined,
      createdAt: now,
      lastSeenAt: now,
      email: identity?.email,
      name: identity?.name,
      image: identity?.pictureUrl,
    } as any);
    return userId;
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

// Convex Auth configuration: Google OAuth + Email/Password
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password(),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }) as any,
  ],
});
