import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

const planValidator = v.union(
  v.literal("free"),
  v.literal("pro"),
  v.literal("enterprise"),
);

export const listPlans = query({
  args: {},
  handler: async () => [
    {
      id: "free" as const,
      name: "Free",
      price: "₹0",
      description: "For personal exploration and small projects.",
      features: ["2 projects", "Basic AI models", "1 GB storage", "Personal workspace"],
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: "₹799/month",
      description: "For students, creators and growing teams.",
      features: ["Unlimited projects", "Team collaboration", "Advanced search", "25 GB storage"],
    },
    {
      id: "enterprise" as const,
      name: "Enterprise",
      price: "Custom",
      description: "For organisations requiring governance and auditability.",
      features: ["SSO and team controls", "Audit logs", "Advanced analytics", "Priority support"],
    },
  ],
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return { plan: user.plan };
  },
});

export const changePlan = mutation({
  args: { plan: planValidator },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    const activeSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .first();

    if (activeSubscription) {
      await ctx.db.patch(activeSubscription._id, { status: "cancelled", updatedAt: now });
    }

    await ctx.db.insert("subscriptions", {
      userId: user._id,
      plan: args.plan,
      status: "active",
      startedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(user._id, { plan: args.plan, updatedAt: now });
  },
});
