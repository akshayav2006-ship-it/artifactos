/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import agent from "@convex-dev/agent/test";
import { describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  agent.register(t);
  const owner = t.withIdentity({
    subject: "owner",
    email: "owner@example.com",
    emailVerified: true,
  });
  const member = t.withIdentity({
    subject: "member",
    email: "member@example.com",
    emailVerified: true,
  });
  const reviewer = t.withIdentity({
    subject: "reviewer",
    email: "reviewer@example.com",
    emailVerified: true,
  });
  const outsider = t.withIdentity({
    subject: "outsider",
    email: "outsider@example.com",
    emailVerified: true,
  });
  const ownerId = await owner.mutation(api.users.syncCurrentUser, {
    name: "Owner",
    email: "owner@example.com",
  });
  const memberId = await member.mutation(api.users.syncCurrentUser, {
    name: "Contributor",
    email: "member@example.com",
  });
  const reviewerId = await reviewer.mutation(api.users.syncCurrentUser, {
    name: "Reviewer",
    email: "reviewer@example.com",
  });
  await outsider.mutation(api.users.syncCurrentUser, {
    name: "Outsider",
    email: "outsider@example.com",
  });
  const projectId = await owner.mutation(api.projects.create, {
    name: "Research",
    description: "Project description",
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("projectMembers", {
      projectId,
      userId: memberId,
      role: "member",
      joinedAt: Date.now(),
    });
    await ctx.db.insert("projectMembers", {
      projectId,
      userId: reviewerId,
      role: "reviewer",
      joinedAt: Date.now(),
    });
  });
  const chatId = await member.mutation(api.workspace.createChat, {
    projectId,
    title: "Research notes",
  });
  const promptId = await member.mutation(api.workspace.sendPrompt, {
    chatId,
    text: "Summarize the findings.",
  });
  const commitId = await member.mutation(api.workspace.commit, {
    chatId,
    promptId,
    title: "Findings",
    body: "Original findings",
    message: "First draft",
  });
  return {
    t,
    owner,
    member,
    reviewer,
    outsider,
    ownerId,
    memberId,
    projectId,
    chatId,
    promptId,
    commitId,
  };
}
describe("project contribution workflow", () => {
  test("commits remain snapshots, pushes enter the library, and owner review records provenance", async () => {
    const s = await setup();
    const before = await s.owner.query(api.workspace.scope, {
      projectId: s.projectId,
      limit: 100,
    });
    expect(before.artifacts).toHaveLength(0);
    await s.member.mutation(api.workspace.addResult, {
      promptId: s.promptId,
      result: "Changed result",
    });
    const artifactId = await s.member.mutation(api.workspace.push, {
      commitId: s.commitId,
    });
    await s.owner.mutation(api.workspace.review, {
      artifactId,
      decision: "verified",
      score: 86,
      feedback: "Checked against the source documents.",
    });
    const after = await s.owner.query(api.workspace.scope, {
      projectId: s.projectId,
      limit: 100,
    });
    expect(after.artifacts[0]).toMatchObject({
      body: "Original findings",
      status: "verified",
      score: 86,
      reviewer: "Owner",
      author: "Contributor",
      promptId: s.promptId,
    });
    expect(after.prompts[0].result).toBe("Changed result");
  });
  test("members, reviewers, and outsiders cannot verify; authors cannot self-verify even as admin", async () => {
    const s = await setup();
    const artifactId = await s.member.mutation(api.workspace.push, {
      commitId: s.commitId,
    });
    const args = {
      artifactId,
      decision: "verified" as const,
      score: 90,
      feedback: "Reviewed",
    };
    await expect(s.member.mutation(api.workspace.review, args)).rejects.toThrow(
      "permission",
    );
    await expect(
      s.reviewer.mutation(api.workspace.review, args),
    ).rejects.toThrow("permission");
    await expect(
      s.outsider.mutation(api.workspace.review, args),
    ).rejects.toThrow("access");
    await s.t.run(async (ctx) => {
      const row = await ctx.db
        .query("projectMembers")
        .withIndex("by_project_id_and_user_id", (q) =>
          q.eq("projectId", s.projectId).eq("userId", s.memberId),
        )
        .unique();
      await ctx.db.patch(row!._id, { role: "admin" });
    });
    await expect(s.member.mutation(api.workspace.review, args)).rejects.toThrow(
      "different project owner or admin",
    );
  });
  test("duplicate pushes and repeated reviews are rejected", async () => {
    const s = await setup();
    const artifactId = await s.member.mutation(api.workspace.push, {
      commitId: s.commitId,
    });
    await expect(
      s.member.mutation(api.workspace.push, { commitId: s.commitId }),
    ).rejects.toThrow("already been pushed");
    await s.owner.mutation(api.workspace.review, {
      artifactId,
      decision: "changes_requested",
      score: 40,
      feedback: "Please add sources.",
    });
    await expect(
      s.owner.mutation(api.workspace.review, {
        artifactId,
        decision: "verified",
        score: 99,
        feedback: "Changed my mind",
      }),
    ).rejects.toThrow("already reviewed");
  });
  test("project and personal chat isolation is enforced on reads and writes", async () => {
    const s = await setup();
    await expect(
      s.outsider.query(api.workspace.scope, {
        projectId: s.projectId,
        limit: 100,
      }),
    ).rejects.toThrow("access");
    await expect(
      s.outsider.query(api.workspace.scope, { chatId: s.chatId, limit: 100 }),
    ).rejects.toThrow("access");
    const personal = await s.member.mutation(api.workspace.createChat, {
      title: "Private chat",
    });
    await expect(
      s.owner.query(api.workspace.scope, { chatId: personal, limit: 100 }),
    ).rejects.toThrow("private");
    await expect(
      s.owner.mutation(api.workspace.sendPrompt, {
        chatId: s.chatId,
        text: "Impersonation",
      }),
    ).rejects.toThrow("author");
  });
  test("personal chat can join a project; first commit locks that assignment", async () => {
    const s = await setup();
    const chatId = await s.member.mutation(api.workspace.createChat, {
      title: "New chat",
    });
    const promptId = await s.member.mutation(api.workspace.sendPrompt, {
      chatId,
      text: "A new idea",
    });
    await s.member.mutation(api.workspace.assignChat, {
      chatId,
      projectId: s.projectId,
    });
    const scope = await s.owner.query(api.workspace.scope, {
      projectId: s.projectId,
      limit: 100,
    });
    expect(scope.prompts.find((p) => p.id === promptId)?.projectId).toBe(
      s.projectId,
    );
    await expect(
      s.member.mutation(api.workspace.assignChat, { chatId: s.chatId }),
    ).rejects.toThrow("locked");
  });
  test("review scores require finite integers from zero to one hundred", async () => {
    const s = await setup();
    const artifactId = await s.member.mutation(api.workspace.push, {
      commitId: s.commitId,
    });
    for (const score of [-1, 101, 4.5])
      await expect(
        s.owner.mutation(api.workspace.review, {
          artifactId,
          decision: "verified",
          score,
          feedback: "Notes",
        }),
      ).rejects.toThrow("integer");
  });
  test("invitation identity cannot be replaced by a client supplied email", async () => {
    const s = await setup();
    await s.outsider.mutation(api.users.syncCurrentUser, {
      email: "member@example.com",
      name: "Attempted spoof",
    });
    expect((await s.outsider.query(api.users.current, {}))?.email).toBe(
      "outsider@example.com",
    );
    const invitationId = await s.owner.mutation(api.team.inviteMember, {
      projectId: s.projectId,
      email: "new@example.com",
      role: "member",
    });
    await expect(
      s.outsider.mutation(api.team.acceptInvitation, { invitationId }),
    ).rejects.toThrow("another email");
  });
  test("prompt scores include review provenance independently of artifact pagination", async () => {
    const s = await setup();
    const artifactId = await s.member.mutation(api.workspace.push, {
      commitId: s.commitId,
    });
    await s.owner.mutation(api.workspace.review, {
      artifactId,
      decision: "verified",
      score: 83,
      feedback: "Sources checked.",
    });
    const result = await s.owner.query(api.workspace.listPrompts, {
      projectId: s.projectId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(result.page[0].review).toMatchObject({
      score: 83,
      reviewer: "Owner",
      title: "Findings",
    });
    const commits = await s.member.query(api.workspace.listCommits, {
      chatId: s.chatId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(commits.page[0].pushed).toBe(true);
  });
  test("verified invitations can be accepted only by the intended authenticated email", async () => {
    const s = await setup();
    const id = await s.owner.mutation(api.team.inviteMember, {
      projectId: s.projectId,
      email: "outsider@example.com",
      role: "admin",
    });
    await s.outsider.mutation(api.team.acceptInvitation, { invitationId: id });
    const artifactId = await s.member.mutation(api.workspace.push, {
      commitId: s.commitId,
    });
    await s.outsider.mutation(api.workspace.review, {
      artifactId,
      decision: "verified",
      score: 75,
      feedback: "Reviewed by another administrator.",
    });
    expect(
      (
        await s.owner.query(api.workspace.scope, {
          projectId: s.projectId,
          limit: 10,
        })
      ).artifacts[0].status,
    ).toBe("verified");
  });
  test("Clerk tokens without email claims can open their own workspace", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({ subject: "standard-clerk-session" });
    await user.mutation(api.users.syncCurrentUser, {
      name: "Contributor",
      email: "display@example.com",
    });
    const id = await user.mutation(api.projects.create, {
      name: "My project",
      description: "Authenticated by Clerk identity",
    });
    expect(
      (await user.query(api.projects.listMine, { includeArchived: false }))[0]
        ._id,
    ).toBe(id);
    expect(await user.query(api.team.listMyInvitations, {})).toEqual([]);
  });
  test("display email cannot claim an invitation when verified claims are missing", async () => {
    const s = await setup();
    const invitationId = await s.owner.mutation(api.team.inviteMember, {
      projectId: s.projectId,
      email: "target@example.com",
      role: "admin",
    });
    for (const identity of [
      { subject: "claimless" },
      {
        subject: "unverified",
        email: "target@example.com",
        emailVerified: false,
      },
    ]) {
      const user = s.t.withIdentity(identity);
      await user.mutation(api.users.syncCurrentUser, {
        name: "Profile",
        email: "target@example.com",
      });
      expect(await user.query(api.team.listMyInvitations, {})).toEqual([]);
      await expect(
        user.mutation(api.team.acceptInvitation, { invitationId }),
      ).rejects.toThrow("verified by the sign-in provider");
      await expect(
        user.mutation(api.team.rejectInvitation, { invitationId }),
      ).rejects.toThrow("Invitation not found");
      await expect(
        user.query(api.projects.get, { projectId: s.projectId }),
      ).rejects.toThrow("access");
    }
  });
  test("missing email configuration does not create an invitation", async () => {
    const s = await setup();
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("INVITE_FROM_EMAIL", "");
    vi.stubEnv("APP_URL", "");
    try {
      await expect(
        s.owner.action(api.email.invite, {
          projectId: s.projectId,
          email: "new@example.com",
          role: "member",
        }),
      ).rejects.toThrow("Email invitations are not enabled");
      expect(
        await s.owner.query(api.team.listProjectInvitations, {
          projectId: s.projectId,
        }),
      ).toHaveLength(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  test("retry reuses an unsent invitation and cannot change its role", async () => {
    const s = await setup();
    const id = await s.owner.mutation(api.team.inviteMember, {
      projectId: s.projectId,
      email: "new@example.com",
      role: "member",
    });
    await s.t.run((ctx) => ctx.db.patch(id, { delivery: "not_configured" }));
    const args = {
      projectId: s.projectId,
      email: "new@example.com",
      role: "member" as const,
    };
    expect(await s.owner.query(internal.email.pendingForRetry, args)).toBe(id);
    await expect(
      s.member.query(internal.email.pendingForRetry, args),
    ).rejects.toThrow("permission");
    await expect(
      s.owner.query(internal.email.pendingForRetry, { ...args, role: "admin" }),
    ).rejects.toThrow("different role");
    await s.t.run((ctx) => ctx.db.patch(id, { delivery: "sent" }));
    await expect(
      s.owner.query(internal.email.pendingForRetry, args),
    ).rejects.toThrow("already been sent");
  });
});
