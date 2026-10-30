import { documentAttachment } from './workspaceValidators';
import { validateAttachment } from '../shared/documents';
import { assignApprovers, approverViews } from "./approvals";
import { v } from "convex/values";
import { createThread, saveMessage } from "@convex-dev/agent";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { requireCurrentUser, requireMembership, requireRole } from "./lib/auth";
import {
  artifactView,
  chatView,
  commitView,
  promptView,
  responseVersionView,
} from "./workspaceValidators";

function text(value: string, max = 12000) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max)
    throw new Error(`Enter between 1 and ${max} characters.`);
  return trimmed;
}
export async function chatAccess(
  ctx: QueryCtx | MutationCtx,
  chatId: Id<"workChats">,
  write = false,
) {
  const user = await requireCurrentUser(ctx);
  const chat = await ctx.db.get(chatId);
  if (!chat) throw new Error("Chat not found.");
  if (chat.projectId) {
    if (write)
      await requireRole(ctx, chat.projectId, ["owner", "admin", "member"]);
    else await requireMembership(ctx, chat.projectId);
  } else if (chat.authorId !== user._id)
    throw new Error("This chat is private.");
  if (write && chat.authorId !== user._id)
    throw new Error("Only the chat author can edit this chat.");
  return { chat, user };
}
export const scope = query({
  args: {
    projectId: v.optional(v.id("projects")),
    chatId: v.optional(v.id("workChats")),
    limit: v.number(),
  },
  returns: v.object({
    chats: v.array(chatView),
    prompts: v.array(promptView),
    commits: v.array(commitView),
    artifacts: v.array(artifactView),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (args.projectId) await requireMembership(ctx, args.projectId);
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)
      throw new Error("Invalid page size.");
    const limit = args.limit;
    const chats = args.projectId
      ? await ctx.db
          .query("workChats")
          .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("workChats")
          .withIndex("by_authorId_and_projectId", (q) =>
            q.eq("authorId", user._id).eq("projectId", undefined),
          )
          .order("desc")
          .take(limit);
    const prompts = args.chatId
      ? (await chatAccess(ctx, args.chatId),
        await ctx.db
          .query("workPrompts")
          .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId!))
          .order("desc")
          .take(limit))
      : args.projectId
        ? await ctx.db
            .query("workPrompts")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .order("desc")
            .take(limit)
        : await ctx.db
            .query("workPrompts")
            .withIndex("by_authorId_and_projectId", (q) =>
              q.eq("authorId", user._id).eq("projectId", undefined),
            )
            .order("desc")
            .take(limit);
    const commits = args.chatId
      ? await ctx.db
          .query("workCommits")
          .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId!))
          .order("desc")
          .take(limit)
      : [];
    const artifacts = args.projectId
      ? await ctx.db
          .query("workArtifacts")
          .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId!))
          .order("desc")
          .take(limit)
      : [];
    return {
      chats: chats.map((c) => ({
        id: c._id,
        title: c.title,
        projectId: c.projectId || "",
        authorId: c.authorId,
        author: c.author,
        finalCommitId: c.finalCommitId,
        createdAt: c.createdAt,
      })),
      prompts: prompts.map(({ _id, _creationTime, ...p }) => {
        void _creationTime;
        return { ...p, id: _id, projectId: p.projectId || "" };
      }),
      commits: commits.map(({ _id, _creationTime, ...c }) => {
        void _creationTime;
        return { ...c, id: _id, projectId: c.projectId || "" };
      }),
      artifacts: await Promise.all(artifacts.map(async ({ _id, _creationTime, reviewerId, ...a }) => {
        void _creationTime;
        void reviewerId;
        return { ...a, id: _id, approvers: await approverViews(ctx, _id) };
      })),
      hasMore: [chats, prompts, commits, artifacts].some(
        (rows) => rows.length === limit,
      ),
    };
  },
});
export const createChat = mutation({
  args: { projectId: v.optional(v.id("projects")), title: v.string() },
  returns: v.id("workChats"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (args.projectId)
      await requireRole(ctx, args.projectId, ["owner", "admin", "member"]);
    const title = text(args.title, 120);
    const agentThreadId = await createThread(ctx, components.agent, {
      userId: user._id,
      title,
    });
    return await ctx.db.insert("workChats", {
      projectId: args.projectId,
      title,
      authorId: user._id,
      author: user.name,
      agentThreadId,
      createdAt: Date.now(),
    });
  },
});
export const assignChat = mutation({
  args: { chatId: v.id("workChats"), projectId: v.optional(v.id("projects")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await chatAccess(ctx, args.chatId, true);
    if (args.projectId)
      await requireRole(ctx, args.projectId, ["owner", "admin", "member"]);
    const commit = await ctx.db
      .query("workCommits")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .first();
    if (commit)
      throw new Error(
        "Project is locked after the first commit. Start a new chat for another project.",
      );
    const prompts = await ctx.db
      .query("workPrompts")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .take(101);
    if (prompts.length > 100)
      throw new Error(
        "Start a new chat in the destination project; this history is too large to move in one step.",
      );
    for (const p of prompts)
      await ctx.db.patch(p._id, { projectId: args.projectId });
    await ctx.db.patch(args.chatId, { projectId: args.projectId });
    return null;
  },
});
export const sendPrompt = mutation({
  args: { chatId: v.id("workChats"), text: v.string() },
  returns: v.id("workPrompts"),
  handler: async (ctx, args) => {
    const { chat, user } = await chatAccess(ctx, args.chatId, true);
    const body = text(args.text);
    await saveMessage(ctx, components.agent, {
      threadId: chat.agentThreadId,
      message: { role: "user", content: body },
    });
    return await ctx.db.insert("workPrompts", {
      chatId: chat._id,
      projectId: chat.projectId,
      authorId: user._id,
      author: user.name,
      text: body,
      result: "",
      status: "saved",
      createdAt: Date.now(),
    });
  },
});
export const savePrompt = mutation({
  args: { promptId: v.id("workPrompts") },
  returns: v.null(),
  handler: async (ctx, { promptId }) => {
    const prompt = await ctx.db.get(promptId);
    if (!prompt) throw new Error("Prompt not found.");
    await chatAccess(ctx, prompt.chatId, true);
    await ctx.db.patch(promptId, { saved: true });
    return null;
  },
});
// Preserve existing results without inventing provenance for pre-history records.
async function preserveResult(ctx: MutationCtx, prompt: Doc<"workPrompts">) {
  if (prompt.currentVersionId || !prompt.result) return prompt.currentVersionId;
  const versionId = await ctx.db.insert("workResponseVersions", {
    chatId: prompt.chatId, promptId: prompt._id,
    authorId: prompt.authorId, author: prompt.author,
    body: prompt.result, source: "legacy", createdAt: Date.now(),
  });
  await ctx.db.patch(prompt._id, { currentVersionId: versionId });
  return versionId;
}
export const addResult = mutation({
  args: { promptId: v.id("workPrompts"), result: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) throw new Error("Prompt not found.");
    const { chat, user } = await chatAccess(ctx, prompt.chatId, true);
    if (prompt.status === "generating") throw new Error("Wait for the current reply to finish.");
    const result = text(args.result);
    await preserveResult(ctx, prompt);
    await saveMessage(ctx, components.agent, {
      threadId: chat.agentThreadId,
      message: {
        role: "user",
        content: `Contributor attached a result:\n${result}`,
      },
    });
    const currentVersionId = await ctx.db.insert("workResponseVersions", {
      chatId: chat._id, promptId: prompt._id, authorId: user._id,
      author: user.name, body: result, source: "manual", createdAt: Date.now(),
    });
    await ctx.db.patch(prompt._id, {
      result, saved: true, status: "complete", currentVersionId,
      model: undefined, provenance: undefined, error: undefined,
    });
    return null;
  },
});
export const commit = mutation({
  args: {
    chatId: v.id("workChats"),
    promptId: v.id("workPrompts"),
    title: v.string(),
    body: v.string(),
    message: v.string(),
    attachment: v.optional(documentAttachment),
  },
  returns: v.id("workCommits"),
  handler: async (ctx, args) => {
    const { chat, user } = await chatAccess(ctx, args.chatId, true);
    if (!chat.projectId)
      throw new Error("Choose a project before committing an artifact.");
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.chatId !== chat._id)
      throw new Error("The source prompt must belong to this chat.");
    validateAttachment(args.attachment);
    const body = text(args.body);
    const matchesReply = !!prompt.reply && body === prompt.reply.trim();
    const matchesResult = !!prompt.result && body === prompt.result.trim();
    const sourceModel = matchesReply ? prompt.replyProvenance : matchesResult ? prompt.provenance : undefined;
    const sourceVersionId = matchesReply && prompt.aiVersionId ? prompt.aiVersionId
      : matchesResult ? await preserveResult(ctx, prompt)
      : await ctx.db.insert("workResponseVersions", {
        chatId: chat._id, promptId: prompt._id, authorId: user._id, author: user.name,
        body, source: "manual", createdAt: Date.now(),
      });
    await ctx.db.patch(prompt._id, { saved: true });
    return await ctx.db.insert("workCommits", {
      sourceVersionId,
      sourceModel,
      attachment: args.attachment,
      chatId: chat._id,
      projectId: chat.projectId,
      promptId: prompt._id,
      authorId: user._id,
      author: user.name,
      title: text(args.title, 120),
      body,
      message: text(args.message, 500),
      createdAt: Date.now(),
    });
  },
});
export const selectFinal = mutation({
  args: { commitId: v.id("workCommits") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const commit = await ctx.db.get(args.commitId);
    if (!commit?.projectId) throw new Error("A project commit is required.");
    const { chat, user } = await chatAccess(ctx, commit.chatId, true);
    if (commit.authorId !== user._id)
      throw new Error("Only the contributor can finalize this commit.");
    await ctx.db.patch(chat._id, { finalCommitId: commit._id });
    return null;
  },
});
export const push = mutation({
  args: { commitId: v.id("workCommits"), approverIds: v.optional(v.array(v.id("users"))) },
  returns: v.id("workArtifacts"),
  handler: async (ctx, args) => {
    const commit = await ctx.db.get(args.commitId);
    if (!commit?.projectId) throw new Error("A project commit is required.");
    const { chat, user } = await chatAccess(ctx, commit.chatId, true);
    if (commit.authorId !== user._id)
      throw new Error("Only the contributor can push this commit.");
    const previous = await ctx.db
      .query("workArtifacts")
      .withIndex("by_commitId", (q) => q.eq("commitId", commit._id))
      .unique();
    if (previous) throw new Error("This commit has already been pushed.");
    if (chat.finalCommitId !== commit._id)
      throw new Error("Select this commit as the final version before submitting it.");
    const { _id, _creationTime, ...snapshot } = commit;
    void _creationTime;
    const artifactId = await ctx.db.insert("workArtifacts", {
      ...snapshot,
      projectId: commit.projectId,
      commitId: _id,
      createdAt: Date.now(),
      status: "pending",
      requiredApprovals: args.approverIds?.length,
    });
    await assignApprovers(ctx, artifactId, commit.projectId, user._id, args.approverIds);
    return artifactId;
  },
});
export const review = mutation({
  args: {
    artifactId: v.id("workArtifacts"),
    decision: v.union(v.literal("verified"), v.literal("changes_requested")),
    score: v.number(),
    feedback: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) throw new Error("Artifact not found.");
    const membership = await requireRole(ctx, artifact.projectId, ["owner", "admin", "reviewer"]);
    if (artifact.authorId === user._id)
      throw new Error(
        "A different project owner or admin, or a designated reviewer, must review your contribution.",
      );
    if (artifact.status !== "pending")
      throw new Error(
        "This submission was already reviewed. Push a new commit for another review.",
      );
    if (!Number.isInteger(args.score) || args.score < 0 || args.score > 100)
      throw new Error("Trust score must be an integer from 0 to 100.");
    const requests = await ctx.db.query("approvalRequests").withIndex("by_artifactId", q => q.eq("artifactId", artifact._id)).take(101);
    if (requests.length > 100) throw new Error("Too many approval requests for this submission.");
    const ownRequest = requests.find(r => r.userId === user._id);
    // Older submissions without assignments retain owner/admin review access.
    if (!ownRequest && (artifact.requiredApprovals !== undefined || requests.length || membership.role === "reviewer"))
      throw new Error("Only a designated approver has permission to review this submission.");
    if (ownRequest?.resolved || ownRequest?.decision)
      throw new Error("You have already reviewed this submission.");
    const reviewedAt = Date.now();
    const feedback = text(args.feedback, 2000);
    if (ownRequest) await ctx.db.patch(ownRequest._id, {
      decision: args.decision, score: args.score, feedback, reviewedAt, resolved: true,
    });
    const approvals = requests.filter(r => r.decision === "verified");
    const approved = args.decision === "verified" && approvals.length + 1 >= (artifact.requiredApprovals ?? 1);
    if (args.decision === "changes_requested" || approved) {
      await ctx.db.patch(artifact._id, {
        status: args.decision,
        score: approved ? Math.round((approvals.reduce((sum, r) => sum + r.score!, 0) + args.score) / (approvals.length + 1)) : args.score,
        feedback, reviewer: user.name, reviewerId: user._id, reviewedAt,
      });
      for (const request of requests) await ctx.db.patch(request._id, { resolved: true });
    }
    return null;
  },
});

// Paginated libraries let projects grow without hiding older contributions.
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
export const listPrompts = query({
  args: {
    projectId: v.optional(v.id("projects")),
    chatId: v.optional(v.id("workChats")),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(promptView),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (args.projectId) await requireMembership(ctx, args.projectId);
    if (args.chatId) await chatAccess(ctx, args.chatId);
    const source = args.chatId
      ? ctx.db
          .query("workPrompts")
          .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId!))
      : args.projectId
        ? ctx.db
            .query("workPrompts")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        : ctx.db
            .query("workPrompts")
            .withIndex("by_authorId_and_projectId", (q) =>
              q.eq("authorId", user._id).eq("projectId", undefined),
            );
    const result = await source.order("desc").paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async ({ _id, _creationTime, ...p }) => {
        void _creationTime;
        const review = await ctx.db
          .query("workArtifacts")
          .withIndex("by_promptId_and_reviewedAt", (q) => q.eq("promptId", _id))
          .order("desc")
          .first();
        return {
          ...p,
          id: _id,
          projectId: p.projectId || "",
          ...(review?.score !== undefined
            ? {
                review: {
                  title: review.title,
                  score: review.score,
                  reviewer: review.reviewer!,
                  reviewedAt: review.reviewedAt!,
                  status: review.status,
                },
              }
            : {}),
        };
      }),
    );
    return { ...result, page };
  },
});
export const listArtifacts = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(artifactView),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.projectId);
    const result = await ctx.db
      .query("workArtifacts")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(result.page.map(async ({ _id, _creationTime, reviewerId, ...a }) => {
        void _creationTime;
        void reviewerId;
        return { ...a, id: _id, approvers: await approverViews(ctx, _id) };
      })),
    };
  },
});
export const listCommits = query({
  args: { chatId: v.id("workChats"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    commitView.extend({ pushed: v.boolean() }),
  ),
  handler: async (ctx, args) => {
    await chatAccess(ctx, args.chatId);
    const result = await ctx.db
      .query("workCommits")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async ({ _id, _creationTime, ...c }) => {
        void _creationTime;
        const pushed = await ctx.db
          .query("workArtifacts")
          .withIndex("by_commitId", (q) => q.eq("commitId", _id))
          .unique();
        return {
          ...c,
          id: _id,
          projectId: c.projectId || "",
          pushed: !!pushed,
        };
      }),
    );
    return { ...result, page };
  },
});

export const chats = query({
  args: {
    projectId: v.optional(v.id("projects")),
    chatId: v.optional(v.id("workChats")),
  },
  returns: v.array(chatView),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (args.projectId) await requireMembership(ctx, args.projectId);
    const rows = args.projectId
      ? await ctx.db
          .query("workChats")
          .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
          .order("desc")
          .take(100)
      : await ctx.db
          .query("workChats")
          .withIndex("by_authorId_and_projectId", (q) =>
            q.eq("authorId", user._id).eq("projectId", undefined),
          )
          .order("desc")
          .take(100);
    if (args.chatId && !rows.some((c) => c._id === args.chatId))
      rows.unshift((await chatAccess(ctx, args.chatId)).chat);
    return rows.map((c) => ({
      id: c._id,
      title: c.title,
      projectId: c.projectId || "",
      authorId: c.authorId,
      author: c.author,
      finalCommitId: c.finalCommitId,
      createdAt: c.createdAt,
    }));
  },
});

export const listResponseVersions = query({
  args: { chatId: v.id("workChats"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(responseVersionView),
  handler: async (ctx, args) => {
    await chatAccess(ctx, args.chatId);
    const result = await ctx.db.query("workResponseVersions")
      .withIndex("by_chatId", q => q.eq("chatId", args.chatId))
      .order("desc").paginate(args.paginationOpts);
    return { ...result, page: result.page.map(({ _id, _creationTime, ...version }) => {
      void _creationTime;
      return { ...version, id: _id };
    }) };
  },
});
