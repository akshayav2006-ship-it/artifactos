import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireCurrentUser,
  requireMembership,
  requireRole,
  verifiedInvitationEmail,
} from "./lib/auth";

const invitationRole = v.union(
  v.literal("admin"),
  v.literal("member"),
  v.literal("reviewer"),
  v.literal("viewer"),
);

export const listMembers = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.projectId);
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .take(200);

    const result = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (!user) continue;
      result.push({
        membershipId: membership._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        role: membership.role,
        joinedAt: membership.joinedAt,
      });
    }
    return result;
  },
});

export const listProjectInvitations = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.projectId, ["owner", "admin"]);
    return await ctx.db
      .query("invitations")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(100);
  },
});

export const listMyInvitations = query({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    const email = await verifiedInvitationEmail(ctx);
    if (!email) return [];
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", email).eq("status", "pending"),
      )
      .order("desc")
      .take(100);

    const result = [];
    for (const invitation of invitations) {
      const project = await ctx.db.get(invitation.projectId);
      if (!project) continue;
      result.push({ ...invitation, projectName: project.name });
    }
    return result;
  },
});

export const inviteMember = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: invitationRole,
  },
  handler: async (ctx, args) => {
    const inviter = await requireCurrentUser(ctx);
    await requireRole(ctx, args.projectId, ["owner", "admin"]);

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Enter a valid email address.");
    if (email === inviter.email)
      throw new Error("You are already in this project.");

    const previousInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_project_id_and_email", (q) =>
        q.eq("projectId", args.projectId).eq("email", email),
      )
      .order("desc")
      .first();

    if (
      previousInvitation?.status === "pending" &&
      previousInvitation.expiresAt > Date.now()
    ) {
      throw new Error("A pending invitation already exists for this email.");
    }

    const now = Date.now();
    return await ctx.db.insert("invitations", {
      projectId: args.projectId,
      email,
      role: args.role,
      invitedBy: inviter._id,
      status: "pending",
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      createdAt: now,
    });
  },
});

export const acceptInvitation = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const email = await verifiedInvitationEmail(ctx);
    if (!email)
      throw new Error(
        "Your email must be verified by the sign-in provider before accepting an invitation.",
      );
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found.");
    if (invitation.email !== email)
      throw new Error("This invitation belongs to another email.");
    if (invitation.status !== "pending")
      throw new Error("This invitation is no longer pending.");
    if (invitation.expiresAt < Date.now())
      throw new Error("This invitation has expired.");

    const existingMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_id_and_user_id", (q) =>
        q.eq("projectId", invitation.projectId).eq("userId", user._id),
      )
      .unique();

    if (!existingMembership) {
      await ctx.db.insert("projectMembers", {
        projectId: invitation.projectId,
        userId: user._id,
        role: invitation.role,
        joinedAt: Date.now(),
      });
    }

    await ctx.db.patch(invitation._id, {
      status: "accepted",
      respondedAt: Date.now(),
    });
  },
});

export const rejectInvitation = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);
    const email = await verifiedInvitationEmail(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.email !== email)
      throw new Error("Invitation not found.");
    if (invitation.status !== "pending")
      throw new Error("Invitation is not pending.");
    await ctx.db.patch(invitation._id, {
      status: "rejected",
      respondedAt: Date.now(),
    });
  },
});

export const revokeInvitation = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found.");
    await requireRole(ctx, invitation.projectId, ["owner", "admin"]);
    if (invitation.status !== "pending")
      throw new Error("Only pending invitations can be revoked.");
    await ctx.db.patch(invitation._id, {
      status: "revoked",
      respondedAt: Date.now(),
    });
  },
});

export const updateMemberRole = mutation({
  args: {
    membershipId: v.id("projectMembers"),
    role: invitationRole,
  },
  handler: async (ctx, args) => {
    const actor = await requireCurrentUser(ctx);
    const target = await ctx.db.get(args.membershipId);
    if (!target) throw new Error("Member not found.");
    const actorMembership = await requireRole(ctx, target.projectId, [
      "owner",
      "admin",
    ]);

    if (target.role === "owner")
      throw new Error("The project owner role cannot be changed.");
    if (target.userId === actor._id)
      throw new Error("You cannot change your own role.");
    if (
      actorMembership.role === "admin" &&
      (target.role === "admin" || args.role === "admin")
    ) {
      throw new Error("Only the owner can manage administrators.");
    }

    await ctx.db.patch(target._id, { role: args.role });
  },
});

export const removeMember = mutation({
  args: { membershipId: v.id("projectMembers") },
  handler: async (ctx, args) => {
    const actor = await requireCurrentUser(ctx);
    const target = await ctx.db.get(args.membershipId);
    if (!target) throw new Error("Member not found.");
    const actorMembership = await requireRole(ctx, target.projectId, [
      "owner",
      "admin",
    ]);

    if (target.role === "owner")
      throw new Error("The project owner cannot be removed.");
    if (target.userId === actor._id)
      throw new Error("Use Leave project to remove yourself.");
    if (actorMembership.role === "admin" && target.role === "admin") {
      throw new Error("Only the owner can remove another administrator.");
    }

    await ctx.db.delete(target._id);
  },
});

export const leaveProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const membership = await requireMembership(ctx, args.projectId);
    if (membership.role === "owner")
      throw new Error("The owner cannot leave the project.");
    await ctx.db.delete(membership._id);
  },
});
