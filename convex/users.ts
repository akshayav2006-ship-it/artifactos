import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in.");

    const email = identity.email?.trim().toLowerCase();
    if (!email) throw new Error("Your Clerk account must have an email address.");

    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const name = identity.name?.trim() || email.split("@")[0];
    const imageUrl = identity.pictureUrl || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name: existing.name || name,
        ...(imageUrl ? { imageUrl } : {}),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      ...(imageUrl ? { imageUrl } : {}),
      plan: "free",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => await getCurrentUser(ctx),
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    bio: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const name = args.name.trim();
    const bio = args.bio.trim();

    if (name.length < 2 || name.length > 80) {
      throw new Error("Name must contain between 2 and 80 characters.");
    }
    if (bio.length > 300) throw new Error("Bio cannot exceed 300 characters.");

    await ctx.db.patch(user._id, {
      name,
      bio,
      updatedAt: Date.now(),
    });
  },
});
