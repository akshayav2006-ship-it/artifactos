import { v } from "convex/values";
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
  title: v.string(),
  authorId: v.id("users"),
  author: v.string(),
  projectId: v.optional(v.id("projects")),
  agentThreadId: v.string(),
  createdAt: v.number(),
};
export const promptFields = {
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
};
export const commitFields = {
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
export const artifactFields = {
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
export const artifactView = v.object({
  ...commitView.fields,
  commitId: v.string(),
  status: artifactFields.status,
  score: v.optional(v.number()),
  reviewer: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  feedback: v.optional(v.string()),
});
