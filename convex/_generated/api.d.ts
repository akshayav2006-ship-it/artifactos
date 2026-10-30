/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as approvals from "../approvals.js";
import type * as auth from "../auth.js";
import type * as email from "../email.js";
import type * as gmail from "../gmail.js";
import type * as identityMigration from "../identityMigration.js";
import type * as lib_auth from "../lib/auth.js";
import type * as navigation from "../navigation.js";
import type * as policies from "../policies.js";
import type * as projects from "../projects.js";
import type * as subscriptions from "../subscriptions.js";
import type * as team from "../team.js";
import type * as users from "../users.js";
import type * as workspace from "../workspace.js";
import type * as workspaceValidators from "../workspaceValidators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  approvals: typeof approvals;
  auth: typeof auth;
  email: typeof email;
  gmail: typeof gmail;
  identityMigration: typeof identityMigration;
  "lib/auth": typeof lib_auth;
  navigation: typeof navigation;
  policies: typeof policies;
  projects: typeof projects;
  subscriptions: typeof subscriptions;
  team: typeof team;
  users: typeof users;
  workspace: typeof workspace;
  workspaceValidators: typeof workspaceValidators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
