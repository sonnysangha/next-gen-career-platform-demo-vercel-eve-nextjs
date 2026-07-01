import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  companyDocValidator,
  jobDocValidator,
  recruiterDocValidator,
  profileDocValidator,
  authorSummaryValidator,
} from "./model";

/** All companies with a live count of open roles per company. */
export const getCompanies = query({
  args: {},
  returns: v.array(
    v.object({
      ...companyDocValidator.fields,
      openRoles: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    return await Promise.all(
      companies.map(async (company) => {
        const jobs = await ctx.db
          .query("jobs")
          .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
          .collect();
        return { ...company, openRoles: jobs.length };
      }),
    );
  },
});

/**
 * A company page: the company, its open jobs, its recruiters, and a few
 * employee profiles (users who list an experience at this company). Null when
 * the slug doesn't resolve.
 */
export const getCompanyBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      company: companyDocValidator,
      jobs: v.array(jobDocValidator),
      recruiters: v.array(recruiterDocValidator),
      employees: v.array(
        v.object({
          user: authorSummaryValidator,
          profile: v.union(profileDocValidator, v.null()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (company === null) return null;

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .collect();

    const recruiters = await ctx.db
      .query("recruiters")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();

    // Employees: experiences linked to this company -> unique users. Cap at a
    // few for the company page. experiences has no companyId index, so filter
    // in-handler over the (small, seeded) table.
    const experiences = await ctx.db.query("experiences").collect();
    const seen = new Set<string>();
    const employees: Array<{
      user: {
        _id: import("./_generated/dataModel").Id<"users">;
        name: string;
        username: string;
        imageUrl: string | null;
        headline: string | null;
      };
      profile: import("./_generated/dataModel").Doc<"profiles"> | null;
    }> = [];

    for (const exp of experiences) {
      if (exp.companyId !== company._id) continue;
      if (seen.has(exp.userId)) continue;
      seen.add(exp.userId);
      const user = await ctx.db.get(exp.userId);
      if (user === null) continue;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
      employees.push({
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          imageUrl: user.imageUrl ?? null,
          headline: profile?.headline ?? null,
        },
        profile,
      });
      if (employees.length >= 6) break;
    }

    return { company, jobs, recruiters, employees };
  },
});
