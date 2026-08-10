import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AppCtx = QueryCtx | MutationCtx;

export type ProjectRole =
  | "owner"
  | "admin"
  | "member"
  | "reviewer"
  | "viewer";

export async function getCurrentUser(ctx: AppCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireCurrentUser(ctx: AppCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("You must be signed in and your profile must be synchronised.");
  }
  return user;
}

export async function requireMembership(
  ctx: AppCtx,
  projectId: Id<"projects">,
): Promise<Doc<"projectMembers">> {
  const user = await requireCurrentUser(ctx);
  const membership = await ctx.db
    .query("projectMembers")
    .withIndex("by_project_id_and_user_id", (q) =>
      q.eq("projectId", projectId).eq("userId", user._id),
    )
    .unique();

  if (!membership) throw new Error("You do not have access to this project.");
  return membership;
}

export async function requireRole(
  ctx: AppCtx,
  projectId: Id<"projects">,
  allowedRoles: ProjectRole[],
): Promise<Doc<"projectMembers">> {
  const membership = await requireMembership(ctx, projectId);
  if (!allowedRoles.includes(membership.role)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return membership;
}
