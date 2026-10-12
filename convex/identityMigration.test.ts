/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const newIssuer = "https://new-owner.clerk.accounts.dev";

test("explicit migration preserves ownership and rejects the retired identity", async () => {
  const t = convexTest(schema, modules);
  const old = t.withIdentity({ subject: "user_old", issuer: "https://old.clerk.accounts.dev" });
  const userId = await old.mutation(api.users.syncCurrentUser, { name: "Owner", email: "owner@example.com" });
  const projectId = await old.mutation(api.projects.create, { name: "Preserved", description: "" });
  const args = { userId, expectedClerkId: "user_old", expectedEmail: "owner@example.com", newClerkId: "user_new", newIssuer };
  await expect(t.mutation(internal.identityMigration.rebind, { ...args, expectedEmail: "wrong@example.com" })).rejects.toThrow("original identity");
  expect(await t.mutation(internal.identityMigration.rebind, args)).toBe(userId);
  const current = t.withIdentity({ subject: "user_new", issuer: newIssuer, tokenIdentifier: `${newIssuer}|user_new` });
  expect((await current.query(api.users.current))?._id).toBe(userId);
  expect((await current.query(api.projects.listMine, { includeArchived: false })).some(p => p._id === projectId)).toBe(true);
  expect(await old.query(api.users.current)).toBeNull();
  const impostor = t.withIdentity({ subject: "user_new", issuer: "https://another.clerk.accounts.dev", tokenIdentifier: "https://another.clerk.accounts.dev|user_new" });
  expect(await impostor.query(api.users.current)).toBeNull();
});

test("migration cannot claim an identity already linked to another user", async () => {
  const t = convexTest(schema, modules);
  const old = t.withIdentity({ subject: "user_old" });
  const userId = await old.mutation(api.users.syncCurrentUser, { name: "Owner", email: "owner@example.com" });
  const other = t.withIdentity({ subject: "user_new", issuer: newIssuer, tokenIdentifier: `${newIssuer}|user_new` });
  await other.mutation(api.users.syncCurrentUser, { name: "Other", email: "other@example.com" });
  await expect(t.mutation(internal.identityMigration.rebind, { userId, expectedClerkId: "user_old", expectedEmail: "owner@example.com", newClerkId: "user_new", newIssuer })).rejects.toThrow("already belongs");
  expect((await old.query(api.users.current))?._id).toBe(userId);
});
