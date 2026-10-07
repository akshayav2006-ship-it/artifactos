import { v } from "convex/values";
import { query, internalQuery, internalMutation, internalAction } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { artifactView, approvalDelivery as delivery } from "./workspaceValidators";
import { requireCurrentUser, requireMembership } from "./lib/auth";

export async function assignApprovers(ctx: MutationCtx, artifactId: Id<"workArtifacts">, projectId: Id<"projects">, authorId: Id<"users">, approverIds?: Id<"users">[]) {
  if (!approverIds) throw new Error("Choose at least one required approver before submitting.");
  const selected = new Set(approverIds);
  if (selected.size === 0 || selected.size !== approverIds.length || selected.size > 50)
    throw new Error("Choose between 1 and 50 distinct required approvers.");
  for (const userId of selected) {
    const member = await ctx.db.query("projectMembers").withIndex("by_project_id_and_user_id", q => q.eq("projectId", projectId).eq("userId", userId)).unique();
    if (!member || !["owner", "admin", "reviewer"].includes(member.role) || userId === authorId)
      throw new Error("Required approvers must be other project owners, admins, or reviewers.");
    const requestId = await ctx.db.insert("approvalRequests", {
      artifactId, projectId, userId, resolved: false, delivery: "queued", createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.approvals.deliver, { requestId });
  }
}

export async function approverViews(ctx: QueryCtx, artifactId: Id<"workArtifacts">) {
  const requests = await ctx.db.query("approvalRequests").withIndex("by_artifactId", q => q.eq("artifactId", artifactId)).take(100);
  return await Promise.all(requests.map(async r => ({ userId: r.userId, name: (await ctx.db.get(r.userId))?.name || "Former collaborator", delivery: r.delivery, decision: r.decision, score: r.score, feedback: r.feedback, reviewedAt: r.reviewedAt })));
}

export const mine = query({
  args: {},
  returns: v.array(v.object({ id: v.string(), projectId: v.string(), projectName: v.string(), title: v.string(), author: v.string() })),
  handler: async ctx => {
    const user = await requireCurrentUser(ctx);
    const requests = await ctx.db.query("approvalRequests").withIndex("by_userId_and_resolved", q => q.eq("userId", user._id).eq("resolved", false)).order("desc").take(100);
    const result = [];
    for (const request of requests) {
      const membership = await ctx.db.query("projectMembers").withIndex("by_project_id_and_user_id", q => q.eq("projectId", request.projectId).eq("userId", user._id)).unique();
      if (!membership || !["owner", "admin", "reviewer"].includes(membership.role)) continue;
      const artifact = await ctx.db.get(request.artifactId);
      const project = await ctx.db.get(request.projectId);
      if (artifact?.status === "pending" && project && artifact.authorId !== user._id) result.push({ id: artifact._id, projectId: project._id, projectName: project.name, title: artifact.title, author: artifact.author });
    }
    return result;
  },
});

export const getDelivery = internalQuery({
  args: { requestId: v.id("approvalRequests") },
  returns: v.union(v.null(), v.object({ email: v.string(), project: v.string(), title: v.string(), author: v.string(), requiredApprovals: v.optional(v.number()) })),
  handler: async (ctx, { requestId }) => {
    const request = await ctx.db.get(requestId);
    if (!request || request.resolved || request.delivery === "sent") return null;
    const artifact = await ctx.db.get(request.artifactId);
    const member = await ctx.db.query("projectMembers").withIndex("by_project_id_and_user_id", q => q.eq("projectId", request.projectId).eq("userId", request.userId)).unique();
    if (!artifact || artifact.status !== "pending" || artifact.authorId === request.userId || !member || !["owner", "admin", "reviewer"].includes(member.role)) return null;
    const user = await ctx.db.get(request.userId);
    const project = await ctx.db.get(request.projectId);
    return user?.email && project ? { email: user.email, project: project.name, title: artifact.title, author: artifact.author, requiredApprovals: artifact.requiredApprovals } : null;
  },
});

export const deliveryStatus = internalMutation({
  args: { requestId: v.id("approvalRequests"), delivery },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, { delivery: args.delivery });
    return null;
  },
});

export function approvalMessage(request: { project: string; title: string; author: string; requiredApprovals?: number }, url: string) {
  return {
    subject: `Approval requested: ${request.title.replace(/[\r\n]/g, " ")}`,
    text: `${request.author} submitted "${request.title}" in ${request.project} for your approval.\n\nOpen Artifactos at ${url}, then select Review submission in your approval requests to verify the artifact or request changes.\n\n${request.requiredApprovals === undefined ? "One assigned owner or admin review completes this request." : "Every required approver must approve before the submission is verified. A request for changes stops approval."}`,
  };
}

export const deliver = internalAction({
  args: { requestId: v.id("approvalRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (process.env.EMAIL_PROVIDER === "gmail") {
      await ctx.runAction(internal.gmail.deliverApproval, args);
      return null;
    }
    const request = await ctx.runQuery(internal.approvals.getDelivery, args);
    if (!request) return null;
    const key = process.env.RESEND_API_KEY;
    const from = process.env.INVITE_FROM_EMAIL;
    const url = process.env.APP_URL;
    if (!key || !from || !url) {
      await ctx.runMutation(internal.approvals.deliveryStatus, { ...args, delivery: "not_configured" });
      return null;
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `approval-request/${args.requestId}` },
        body: JSON.stringify({ from, to: [request.email], ...approvalMessage(request, url) }),
      });
      await ctx.runMutation(internal.approvals.deliveryStatus, { ...args, delivery: response.ok ? "sent" : "failed" });
    } catch {
      await ctx.runMutation(internal.approvals.deliveryStatus, { ...args, delivery: "failed" });
    }
    return null;
  },
});

export const artifact = query({
  args: { artifactId: v.id("workArtifacts") },
  returns: v.union(v.null(), artifactView),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) return null;
    await requireMembership(ctx, artifact.projectId);
    const { _id, _creationTime, reviewerId, ...fields } = artifact;
    void _creationTime;
    void reviewerId;
    return { ...fields, id: _id, approvers: await approverViews(ctx, _id) };
  },
});
