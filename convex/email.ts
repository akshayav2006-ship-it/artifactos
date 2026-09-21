/// <reference types="node" />
import { ConvexError, v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/auth";
export const invite = action({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("reviewer"),
      v.literal("viewer"),
    ),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    // Do not create a pending invitation under a misleading Send action when
    // no delivery provider has been configured.
    if (
      !process.env.APP_URL ||
      (process.env.EMAIL_PROVIDER === "gmail"
        ? !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD
        : !process.env.RESEND_API_KEY || !process.env.INVITE_FROM_EMAIL)
    ) {
      throw new ConvexError(
        "Email invitations are not enabled for this workspace yet. The workspace owner needs to connect an email service before sending.",
      );
    }
    const existing: Id<"invitations"> | null = await ctx.runQuery(
      internal.email.pendingForRetry,
      { projectId: args.projectId, email: args.email, role: args.role },
    );
    const invitationId: Id<"invitations"> =
      existing ?? (await ctx.runMutation(api.team.inviteMember, args));
    await ctx.runMutation(internal.email.queue, { invitationId });
    return "Invitation queued for email delivery. Check its status under Collaborators.";
  },
});
export const queue = internalMutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.invitationId);
    if (!invite) throw new Error("Invitation not found.");
    await requireRole(ctx, invite.projectId, ["owner", "admin"]);
    await ctx.db.patch(invite._id, { delivery: "queued" });
    await ctx.scheduler.runAfter(0, internal.email.deliver, args);
    return null;
  },
});
export const getDelivery = internalQuery({
  args: { invitationId: v.id("invitations") },
  returns: v.union(
    v.null(),
    v.object({ email: v.string(), project: v.string(), inviter: v.string() }),
  ),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.invitationId);
    if (!invite || invite.status !== "pending" || invite.expiresAt < Date.now())
      return null;
    const project = await ctx.db.get(invite.projectId);
    const user = await ctx.db.get(invite.invitedBy);
    return project
      ? {
          email: invite.email,
          project: project.name,
          inviter: user?.name || "A project owner",
        }
      : null;
  },
});
export const deliveryStatus = internalMutation({
  args: {
    invitationId: v.id("invitations"),
    delivery: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("not_configured"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invitationId, { delivery: args.delivery });
    return null;
  },
});
export const deliver = internalAction({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (process.env.EMAIL_PROVIDER === "gmail") {
      await ctx.runAction(internal.gmail.deliver, args);
      return null;
    }
    const key = process.env.RESEND_API_KEY;
    const from = process.env.INVITE_FROM_EMAIL;
    const url = process.env.APP_URL;
    if (!key || !from || !url) {
      await ctx.runMutation(internal.email.deliveryStatus, {
        ...args,
        delivery: "not_configured",
      });
      return null;
    }
    const invitation = await ctx.runQuery(internal.email.getDelivery, args);
    if (!invitation) return null;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `project-invite/${args.invitationId}`,
        },
        body: JSON.stringify({
          from,
          to: [invitation.email],
          subject: `You're invited to ${invitation.project}`,
          text: `${invitation.inviter} invited you to collaborate on ${invitation.project} in Artifactos.\n\nSign in using ${invitation.email} at ${url} to accept your invitation.\n\nThis invitation expires in 7 days.`,
        }),
      });
      await ctx.runMutation(internal.email.deliveryStatus, {
        ...args,
        delivery: response.ok ? "sent" : "failed",
      });
    } catch {
      await ctx.runMutation(internal.email.deliveryStatus, {
        ...args,
        delivery: "failed",
      });
    }
    return null;
  },
});

export const pendingForRetry = internalQuery({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("reviewer"),
      v.literal("viewer"),
    ),
  },
  returns: v.union(v.id("invitations"), v.null()),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.projectId, ["owner", "admin"]);
    const invite = await ctx.db
      .query("invitations")
      .withIndex("by_project_id_and_email", (q) =>
        q
          .eq("projectId", args.projectId)
          .eq("email", args.email.trim().toLowerCase()),
      )
      .order("desc")
      .first();
    if (!invite || invite.status !== "pending" || invite.expiresAt < Date.now())
      return null;
    if (invite.role !== args.role)
      throw new ConvexError(
        "A pending invitation already exists with a different role. Use its original role to retry delivery.",
      );
    if (invite.delivery === "sent" || invite.delivery === "queued")
      throw new ConvexError(
        "This invitation has already been sent or is still queued. Check its status under Collaborators.",
      );
    return invite._id;
  },
});
