import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireMembership, requireRole } from "./lib/auth";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const name = args.name.trim();
    const description = args.description.trim();

    if (name.length < 2 || name.length > 100) {
      throw new Error("Project name must contain between 2 and 100 characters.");
    }
    if (description.length > 500) {
      throw new Error("Description cannot exceed 500 characters.");
    }

    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name,
      description,
      ownerId: user._id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("projectMembers", {
      projectId,
      userId: user._id,
      role: "owner",
      joinedAt: now,
    });

    return projectId;
  },
});

export const listMine = query({
  args: { includeArchived: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .take(100);

    const result = [];
    for (const membership of memberships) {
      const project = await ctx.db.get(membership.projectId);
      if (!project) continue;
      if (!args.includeArchived && project.status === "archived") continue;
      result.push({ ...project, role: membership.role });
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx, args.projectId);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found.");

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .take(200);
    const pendingInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_project_id_and_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "pending"),
      )
      .take(200);

    return {
      ...project,
      role: membership.role,
      memberCount: members.length,
      pendingInvitationCount: pendingInvitations.length,
    };
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.projectId, ["owner", "admin"]);
    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length < 2 || name.length > 100) throw new Error("Invalid project name.");
    if (description.length > 500) throw new Error("Description is too long.");

    await ctx.db.patch(args.projectId, {
      name,
      description,
      updatedAt: Date.now(),
    });
  },
});

export const setArchived = mutation({
  args: {
    projectId: v.id("projects"),
    archived: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.projectId, ["owner", "admin"]);
    await ctx.db.patch(args.projectId, {
      status: args.archived ? "archived" : "active",
      updatedAt: Date.now(),
    });
  },
});
