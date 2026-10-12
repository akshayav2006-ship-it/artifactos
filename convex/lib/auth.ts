import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AppCtx = QueryCtx | MutationCtx;

export type ProjectRole = "owner" | "admin" | "member" | "reviewer" | "viewer";

export async function getCurrentUser(
  ctx: AppCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const current = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (current) return current;

  const legacy = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  // Legacy records are upgraded on sync. A bound identity must never be
  // claimed by another issuer merely because its subject happens to match.
  return legacy && !legacy.tokenIdentifier ? legacy : null;
}

export async function requireCurrentUser(ctx: AppCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error(
      "You must be signed in and your profile must be synchronised.",
    );
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

/** Only signed, verified email claims can authorize an email invitation. */
export async function verifiedInvitationEmail(
  ctx: AppCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.email && identity.emailVerified === true
    ? identity.email.trim().toLowerCase()
    : null;
}
