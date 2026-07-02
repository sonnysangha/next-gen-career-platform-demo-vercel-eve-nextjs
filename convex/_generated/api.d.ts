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
import type * as applications from "../applications.js";
import type * as clerkBilling from "../clerkBilling.js";
import type * as companies from "../companies.js";
import type * as demo from "../demo.js";
import type * as drafts from "../drafts.js";
import type * as embeddings from "../embeddings.js";
import type * as eve from "../eve.js";
import type * as feed from "../feed.js";
import type * as files from "../files.js";
import type * as jobs from "../jobs.js";
import type * as model from "../model.js";
import type * as network from "../network.js";
import type * as notifications from "../notifications.js";
import type * as profiles from "../profiles.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  applications: typeof applications;
  clerkBilling: typeof clerkBilling;
  companies: typeof companies;
  demo: typeof demo;
  drafts: typeof drafts;
  embeddings: typeof embeddings;
  eve: typeof eve;
  feed: typeof feed;
  files: typeof files;
  jobs: typeof jobs;
  model: typeof model;
  network: typeof network;
  notifications: typeof notifications;
  profiles: typeof profiles;
  search: typeof search;
  seed: typeof seed;
  users: typeof users;
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

export declare const components: {};
