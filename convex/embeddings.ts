import { v } from "convex/values";
import {
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getUserByIdentity, getProfileForUser } from "./model";

/**
 * Vector-embedding-based job match scoring.
 *
 * Embeddings come from the Vercel AI Gateway (OpenAI-compatible) via plain
 * fetch — no new npm deps, no "use node". The default Convex V8 action runtime
 * supports fetch, so `embedJobs` / `ensureMyProfileEmbedding` are ordinary
 * actions.
 *
 * Model: openai/text-embedding-3-small (1536 dimensions).
 */

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/embeddings";
const EMBED_MODEL = "openai/text-embedding-3-small";
const GATEWAY_BATCH = 50; // max inputs per gateway call

// ── Module-scope helpers (not registered functions) ──────────────────

/**
 * Embed a batch of texts via the Vercel AI Gateway embeddings endpoint.
 * Returns one number[] per input, in the same order.
 */
async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI_GATEWAY_API_KEY is not set on the Convex deployment. " +
        "Set it with `npx convex env set AI_GATEWAY_API_KEY <key>`.",
    );
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `AI Gateway embeddings request failed (${res.status}): ${body}`,
    );
  }

  const json = (await res.json()) as {
    data?: Array<{ embedding: number[] }>;
  };
  const data = json.data;
  if (!data || data.length !== inputs.length) {
    throw new Error(
      `AI Gateway returned ${data?.length ?? 0} embeddings for ${inputs.length} inputs`,
    );
  }
  return data.map((d) => d.embedding);
}

/** Cosine similarity of two equal-length vectors. Returns 0 for degenerate input. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Jobs: backfill embeddings ────────────────────────────────────────

/** Jobs that still need an embedding, with the text to embed. */
export const jobsToEmbed = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("jobs"),
      text: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").collect();
    return jobs
      .filter((job) => job.embedding === undefined)
      .map((job) => ({
        _id: job._id,
        text: `${job.title}\nSeniority: ${job.seniority}\nSkills: ${job.skillsRequired.join(", ")}\n${job.description}`,
      }));
  },
});

/** Persist a computed job embedding. */
export const setJobEmbedding = internalMutation({
  args: {
    jobId: v.id("jobs"),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { embedding: args.embedding });
    return null;
  },
});

/**
 * Backfill embeddings for every job that lacks one. Batches gateway calls to
 * stay under the request-size limit. Idempotent: re-running only touches jobs
 * that are still missing an embedding.
 *
 * Run with: `npx convex run embeddings:embedJobs`
 */
export const embedJobs = action({
  args: {},
  returns: v.object({ embedded: v.number() }),
  handler: async (ctx): Promise<{ embedded: number }> => {
    const todo: Array<{ _id: Id<"jobs">; text: string }> = await ctx.runQuery(
      internal.embeddings.jobsToEmbed,
      {},
    );
    if (todo.length === 0) return { embedded: 0 };

    let embedded = 0;
    for (let i = 0; i < todo.length; i += GATEWAY_BATCH) {
      const chunk = todo.slice(i, i + GATEWAY_BATCH);
      const vectors = await embedTexts(chunk.map((c) => c.text));
      for (let j = 0; j < chunk.length; j++) {
        await ctx.runMutation(internal.embeddings.setJobEmbedding, {
          jobId: chunk[j]._id,
          embedding: vectors[j],
        });
        embedded += 1;
      }
    }
    return { embedded };
  },
});

// ── Profile: ensure the current user's embedding ─────────────────────

/**
 * The current user's profile-embedding input. Returns null when there is no
 * authenticated user. `hasCurrent` is true when the stored embedding already
 * matches the current text (so no re-embed is needed).
 */
export const myProfileEmbeddingInput = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      profileId: v.union(v.id("profiles"), v.null()),
      text: v.string(),
      hasCurrent: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) return null;

    const profile = await getProfileForUser(ctx, me._id);

    const skills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();

    const headline = profile?.headline ?? "";
    const targetRole = profile?.targetRole ?? "";
    const about = profile?.about ?? "";
    const text = `${headline}\nTarget role: ${targetRole}\n${about}\nSkills: ${skills.map((s) => s.name).join(", ")}`;

    const hasCurrent =
      profile !== null &&
      profile.embedding !== undefined &&
      profile.embeddingText === text;

    return {
      profileId: profile?._id ?? null,
      text,
      hasCurrent,
    };
  },
});

/** Persist a computed profile embedding + the text it was derived from. */
export const setProfileEmbedding = internalMutation({
  args: {
    profileId: v.id("profiles"),
    embedding: v.array(v.float64()),
    embeddingText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.profileId, {
      embedding: args.embedding,
      embeddingText: args.embeddingText,
    });
    return null;
  },
});

/**
 * Ensure the current user's profile has an up-to-date embedding. No-op (returns
 * { updated: false }) when unauthenticated, when there is no profile, or when
 * the stored embedding already matches the current profile text. Called from the
 * client on the Jobs page so match scores are populated.
 */
export const ensureMyProfileEmbedding = action({
  args: {},
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx): Promise<{ updated: boolean }> => {
    const input = await ctx.runQuery(
      internal.embeddings.myProfileEmbeddingInput,
      {},
    );
    if (input === null || input.profileId === null || input.hasCurrent) {
      return { updated: false };
    }

    const [embedding] = await embedTexts([input.text]);
    await ctx.runMutation(internal.embeddings.setProfileEmbedding, {
      profileId: input.profileId,
      embedding,
      embeddingText: input.text,
    });
    return { updated: true };
  },
});
