/// <reference types="vite/client" />
import { afterEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
const mail = vi.hoisted(() => ({
  sendMail: vi.fn(),
  close: vi.fn(),
  createTransport: vi.fn(),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: mail.createTransport },
}));
const modules = import.meta.glob("./**/*.ts");
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
async function setup() {
  const t = convexTest(schema, modules);
  const invitationId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      clerkId: "owner",
      name: "Owner",
      email: "owner@example.com",
      plan: "free",
      createdAt: 0,
      updatedAt: 0,
    });
    const projectId = await ctx.db.insert("projects", {
      name: "Research",
      description: "",
      ownerId,
      status: "active",
      createdAt: 0,
      updatedAt: 0,
    });
    return await ctx.db.insert("invitations", {
      projectId,
      email: "recipient@gmail.com",
      role: "member",
      invitedBy: ownerId,
      status: "pending",
      delivery: "queued",
      expiresAt: Date.now() + 60000,
      createdAt: Date.now(),
    });
  });
  vi.stubEnv("GMAIL_USER", "sender@gmail.com");
  vi.stubEnv("GMAIL_APP_PASSWORD", "test only fake password");
  vi.stubEnv("APP_URL", "https://example.com");
  mail.createTransport.mockReturnValue(mail);
  return { t, invitationId };
}
test("Gmail uses the configured account and marks provider acceptance", async () => {
  const { t, invitationId } = await setup();
  mail.sendMail.mockResolvedValue({ accepted: ["recipient@gmail.com"] });
  await t.action(internal.gmail.deliver, { invitationId });
  expect(mail.createTransport).toHaveBeenCalledWith(
    expect.objectContaining({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
    }),
  );
  expect(mail.sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      from: { name: "Artifactos", address: "sender@gmail.com" },
      to: "recipient@gmail.com",
    }),
  );
  expect((await t.run((ctx) => ctx.db.get(invitationId)))?.delivery).toBe(
    "sent",
  );
});
test("missing Gmail credentials never attempt delivery", async () => {
  const { t, invitationId } = await setup();
  vi.stubEnv("GMAIL_APP_PASSWORD", "");
  await t.action(internal.gmail.deliver, { invitationId });
  expect(mail.sendMail).not.toHaveBeenCalled();
  expect((await t.run((ctx) => ctx.db.get(invitationId)))?.delivery).toBe(
    "not_configured",
  );
});
test("SMTP rejection is recorded as failure and the connection is closed", async () => {
  const { t, invitationId } = await setup();
  mail.sendMail.mockRejectedValue(new Error("Authentication rejected"));
  await t.action(internal.gmail.deliver, { invitationId });
  expect((await t.run((ctx) => ctx.db.get(invitationId)))?.delivery).toBe(
    "failed",
  );
  expect(mail.close).toHaveBeenCalled();
});
