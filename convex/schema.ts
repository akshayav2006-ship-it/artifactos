import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { approvalDelivery, approvalReviewFields } from "./workspaceValidators";

import {
  chatFields,
  promptFields,
  commitFields,
  artifactFields,
  responseVersionFields,
} from "./workspaceValidators";

const projectRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("reviewer"),
  v.literal("viewer"),
);

const subscriptionPlan = v.union(
  v.literal("free"),
  v.literal("pro"),
  v.literal("enterprise"),
);

export default defineSchema({
  policyRows: defineTable({ projectId: v.id("projects"), sheet: v.string(), row: v.number(), text: v.string() })
    .index("by_projectId", ["projectId"])
    .searchIndex("search_text", { searchField: "text", filterFields: ["projectId"] }),
  workResponseVersions: defineTable(responseVersionFields)
    .index("by_chatId", ["chatId"]),
  workChats: defineTable(chatFields)
    .index("by_authorId_and_projectId", ["authorId", "projectId"])
    .index("by_projectId", ["projectId"]),
  workPrompts: defineTable(promptFields)
    .index("by_chatId", ["chatId"])
    .index("by_chatId_and_status", ["chatId", "status"])
    .index("by_projectId", ["projectId"])
    .index("by_authorId_and_projectId", ["authorId", "projectId"]),
  workCommits: defineTable(commitFields).index("by_chatId", ["chatId"]),
  workArtifacts: defineTable(artifactFields)
    .index("by_projectId", ["projectId"])
    .index("by_commitId", ["commitId"])
    .index("by_promptId_and_reviewedAt", ["promptId", "reviewedAt"]),
  approvalRequests: defineTable({
    ...approvalReviewFields,
    artifactId: v.id("workArtifacts"),
    projectId: v.id("projects"),
    userId: v.id("users"),
    resolved: v.boolean(),
    delivery: approvalDelivery,
    createdAt: v.number(),
  }).index("by_artifactId", ["artifactId"])
    .index("by_userId_and_resolved", ["userId", "resolved"]),
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    plan: subscriptionPlan,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    description: v.string(),
    ownerId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_owner_id_and_status", ["ownerId", "status"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: projectRole,
    joinedAt: v.number(),
  })
    .index("by_project_id", ["projectId"])
    .index("by_user_id", ["userId"])
    .index("by_project_id_and_user_id", ["projectId", "userId"])
    .index("by_user_id_and_project_id", ["userId", "projectId"]),

  invitations: defineTable({
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("reviewer"),
      v.literal("viewer"),
    ),
    invitedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("revoked"),
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
    delivery: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("sent"),
        v.literal("failed"),
        v.literal("not_configured"),
      ),
    ),
  })
    .index("by_project_id", ["projectId"])
    .index("by_email", ["email"])
    .index("by_email_and_status", ["email", "status"])
    .index("by_project_id_and_email", ["projectId", "email"])
    .index("by_project_id_and_status", ["projectId", "status"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    plan: subscriptionPlan,
    status: v.union(v.literal("active"), v.literal("cancelled")),
    startedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_status", ["userId", "status"]),
});
