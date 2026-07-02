import { v } from "convex/values";
import { query } from "./_generated/server";
import { getProfileForUser } from "./model";

const MAX_PER_GROUP = 5;

/**
 * Global typeahead search across companies, people, and open jobs.
 * Case-insensitive substring matching, capped per group — the jobs page
 * remains the "see all results" surface for deeper queries.
 */
export const global = query({
  args: { q: v.string() },
  returns: v.object({
    companies: v.array(
      v.object({
        _id: v.id("companies"),
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
        industry: v.string(),
      }),
    ),
    people: v.array(
      v.object({
        _id: v.id("users"),
        name: v.string(),
        username: v.string(),
        imageUrl: v.optional(v.string()),
        headline: v.union(v.string(), v.null()),
      }),
    ),
    jobs: v.array(
      v.object({
        _id: v.id("jobs"),
        title: v.string(),
        companyName: v.union(v.string(), v.null()),
        location: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const term = args.q.trim().toLowerCase();
    if (term.length < 2) return { companies: [], people: [], jobs: [] };

    const allCompanies = await ctx.db.query("companies").collect();
    const companies = allCompanies
      .filter((c) =>
        [c.name, c.industry, c.location].join(" ").toLowerCase().includes(term),
      )
      .slice(0, MAX_PER_GROUP)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        logoUrl: c.logoUrl,
        industry: c.industry,
      }));

    const allUsers = await ctx.db.query("users").collect();
    const matchedUsers = allUsers
      .filter((u) => [u.name, u.username].join(" ").toLowerCase().includes(term))
      .slice(0, MAX_PER_GROUP);
    const people = await Promise.all(
      matchedUsers.map(async (u) => {
        const profile = await getProfileForUser(ctx, u._id);
        return {
          _id: u._id,
          name: u.name,
          username: u.username,
          imageUrl: u.imageUrl,
          headline: profile?.headline || null,
        };
      }),
    );

    const allJobs = await ctx.db.query("jobs").collect();
    const openMatches = allJobs
      .filter(
        (j) =>
          j.status !== "closed" &&
          [j.title, j.location].join(" ").toLowerCase().includes(term),
      )
      .slice(0, MAX_PER_GROUP);
    const jobs = await Promise.all(
      openMatches.map(async (j) => {
        const company = await ctx.db.get(j.companyId);
        return {
          _id: j._id,
          title: j.title,
          companyName: company?.name ?? null,
          location: j.location,
        };
      }),
    );

    return { companies, people, jobs };
  },
});
