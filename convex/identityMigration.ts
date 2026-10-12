import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/** Admin-only, explicit rebinding during an approved Clerk-instance migration. */
export const rebind = internalMutation({
  args: {
    userId: v.id("users"),
    expectedClerkId: v.string(),
    expectedEmail: v.string(),
    newClerkId: v.string(),
    newIssuer: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== args.expectedClerkId ||
        user.email !== args.expectedEmail.trim().toLowerCase()) {
      throw new Error("The original identity does not match the migration plan.");
    }
    if (!args.newClerkId.startsWith("user_") ||
        !/^https:\/\/[a-z0-9-]+\.clerk\.accounts\.dev$/.test(args.newIssuer)) {
      throw new Error("Provide the verified development Clerk identity and issuer.");
    }
    const tokenIdentifier = `${args.newIssuer}|${args.newClerkId}`;
    const subjectOwner = await ctx.db.query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.newClerkId)).unique();
    const tokenOwner = await ctx.db.query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier)).unique();
    if ((subjectOwner && subjectOwner._id !== user._id) ||
        (tokenOwner && tokenOwner._id !== user._id)) {
      throw new Error("The destination identity already belongs to another user.");
    }
    await ctx.db.patch(user._id, {
      clerkId: args.newClerkId,
      tokenIdentifier,
      updatedAt: Date.now(),
    });
    return user._id;
  },
});
