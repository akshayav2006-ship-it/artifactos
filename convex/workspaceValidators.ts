import { v } from "convex/values";
export const googleGroundingValidator = v.object({
  sources: v.array(v.object({ url: v.string(), title: v.string() })),
  supports: v.array(v.object({ text: v.string(), sourceIndices: v.array(v.number()) })),
  searchQueries: v.array(v.string()),
  searchEntryPoint: v.optional(v.string()),
});
export const policyCitationValidator = v.object({ marker: v.string(), policyId: v.string(), sheet: v.string(), row: v.number(), text: v.string() });
export const modelProvenance = v.object({
  provider: v.union(v.literal("gemini"), v.literal("chatgpt"), v.literal("groq"), v.literal("openrouter")),
  requestedModel: v.string(),
  resolvedModel: v.optional(v.string()),
  grounding: v.optional(googleGroundingValidator),
  policyCitations: v.optional(v.array(policyCitationValidator)),
});
export const responseVersionFields = {
  chatId: v.id("workChats"),
  promptId: v.id("workPrompts"),
  authorId: v.id("users"),
  author: v.string(),
  body: v.string(),
  source: v.union(v.literal("ai"), v.literal("manual"), v.literal("legacy")),
  provenance: v.optional(modelProvenance),
  createdAt: v.number(),
};
export const responseVersionView = v.object({ ...responseVersionFields, id: v.string() });
export const role = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("reviewer"),
  v.literal("viewer"),
);
export const projectView = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  role,
  ownerId: v.string(),
});
export const chatFields = {
  finalCommitId: v.optional(v.id("workCommits")),
  title: v.string(),
  authorId: v.id("users"),
  author: v.string(),
  projectId: v.optional(v.id("projects")),
  agentThreadId: v.string(),
  createdAt: v.number(),
};
export const promptFields = {
  saved: v.optional(v.boolean()),
  reply: v.optional(v.string()),
  replyProvenance: v.optional(modelProvenance),
  provenance: v.optional(modelProvenance),
  currentVersionId: v.optional(v.id("workResponseVersions")),
  aiVersionId: v.optional(v.id("workResponseVersions")),
  chatId: v.id("workChats"),
  projectId: v.optional(v.id("projects")),
  authorId: v.id("users"),
  author: v.string(),
  text: v.string(),
  result: v.string(),
  createdAt: v.number(),
  status: v.union(
    v.literal("saved"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("failed"),
  ),
  error: v.optional(v.string()),
  model: v.optional(v.string()),
};
export const documentAttachment = v.object({ name: v.string(), mimeType: v.literal("application/pdf"), data: v.string() });
export const commitFields = {
  attachment: v.optional(documentAttachment),
  sourceVersionId: v.optional(v.id("workResponseVersions")),
  sourceModel: v.optional(modelProvenance),
  chatId: v.id("workChats"),
  projectId: v.optional(v.id("projects")),
  promptId: v.id("workPrompts"),
  authorId: v.id("users"),
  author: v.string(),
  title: v.string(),
  body: v.string(),
  message: v.string(),
  createdAt: v.number(),
};
export const approvalReviewFields = {
  decision: v.optional(v.union(v.literal("verified"), v.literal("changes_requested"))),
  score: v.optional(v.number()),
  feedback: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
};
export const artifactFields = {
  requiredApprovals: v.optional(v.number()),
  ...commitFields,
  projectId: v.id("projects"),
  commitId: v.id("workCommits"),
  status: v.union(
    v.literal("pending"),
    v.literal("verified"),
    v.literal("changes_requested"),
  ),
  score: v.optional(v.number()),
  reviewer: v.optional(v.string()),
  reviewerId: v.optional(v.id("users")),
  reviewedAt: v.optional(v.number()),
  feedback: v.optional(v.string()),
};
export const chatView = v.object({
  finalCommitId: v.optional(v.id("workCommits")),
  id: v.string(),
  title: v.string(),
  projectId: v.string(),
  authorId: v.string(),
  author: v.string(),
  createdAt: v.number(),
});
export const promptView = v.object({
  review: v.optional(
    v.object({
      title: v.string(),
      score: v.number(),
      reviewer: v.string(),
      reviewedAt: v.number(),
      status: v.string(),
    }),
  ),
  ...promptFields,
  id: v.string(),
  projectId: v.string(),
  chatId: v.string(),
  authorId: v.string(),
});
export const commitView = v.object({
  ...commitFields,
  id: v.string(),
  projectId: v.string(),
  chatId: v.string(),
  promptId: v.string(),
  authorId: v.string(),
});
export const approvalDelivery = v.union(v.literal("queued"), v.literal("sent"), v.literal("failed"), v.literal("not_configured"));
export const approverView = v.object({ userId: v.string(), name: v.string(), delivery: approvalDelivery, ...approvalReviewFields });
export const artifactView = v.object({
  ...commitView.fields,
  approvers: v.optional(v.array(approverView)),
  requiredApprovals: v.optional(v.number()),
  commitId: v.string(),
  status: artifactFields.status,
  score: v.optional(v.number()),
  reviewer: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  feedback: v.optional(v.string()),
});
