import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  companyDocValidator,
  jobDocValidator,
  recruiterDocValidator,
  profileDocValidator,
  authorSummaryValidator,
  getUserByIdentity,
  getProfileForUser,
  isCompanyAdmin,
  getMyCompanyDoc,
  assertCompanyAdmin,
  baseSlugFrom,
  uniqueCompanySlug,
} from "./model";
import { computeMatchScore } from "./jobs";

const jobIsOpen = (j: { status?: "open" | "closed" }) => j.status !== "closed";

/** All companies with a live count of open roles per company. */
export const getCompanies = query({
  args: { search: v.optional(v.string()) },
  returns: v.array(
    v.object({
      ...companyDocValidator.fields,
      openRoles: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    let companies = await ctx.db.query("companies").collect();
    const term = args.search?.trim().toLowerCase();
    if (term && term.length > 0) {
      companies = companies.filter((c) =>
        [c.name, c.industry, c.location, c.about]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return await Promise.all(
      companies.map(async (company) => {
        const jobs = await ctx.db
          .query("jobs")
          .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
          .collect();
        return { ...company, openRoles: jobs.filter(jobIsOpen).length };
      }),
    );
  },
});

/**
 * A company page: the company, its open jobs, its recruiters, a few employee
 * profiles (users who list an experience at this company), and whether the
 * caller administers it. Null when the slug doesn't resolve.
 */
export const getCompanyBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      company: companyDocValidator,
      jobs: v.array(
        v.object({
          ...jobDocValidator.fields,
          matchScore: v.union(v.number(), v.null()),
        }),
      ),
      recruiters: v.array(recruiterDocValidator),
      employees: v.array(
        v.object({
          user: authorSummaryValidator,
          profile: v.union(profileDocValidator, v.null()),
        }),
      ),
      canManage: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (company === null) return null;

    const me = await getUserByIdentity(ctx);
    const canManage = await isCompanyAdmin(ctx, company, me);
    const myProfile = me !== null ? await getProfileForUser(ctx, me._id) : null;
    const myEmbedding = myProfile?.embedding;

    const allJobs = await ctx.db
      .query("jobs")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .collect();
    const jobs = allJobs.filter(jobIsOpen).map((job) => ({
      ...job,
      matchScore: computeMatchScore(myEmbedding, job.embedding),
    }));

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

    return { company, jobs, recruiters, employees, canManage };
  },
});

/**
 * The company administered by the caller (via their active Clerk organization
 * or page ownership), or null. Drives the "Company dashboard" nav entry.
 */
export const getMyCompany = query({
  args: {},
  returns: v.union(companyDocValidator, v.null()),
  handler: async (ctx) => {
    return await getMyCompanyDoc(ctx);
  },
});

const companyFields = {
  name: v.string(),
  industry: v.string(),
  size: v.string(),
  location: v.string(),
  about: v.string(),
  websiteUrl: v.optional(v.string()),
};

/**
 * Create a company page, linking it to the caller's Clerk organization when
 * an orgId is provided (the "sign up as a company" flow). The caller becomes
 * the fallback owner either way.
 */
export const createCompany = mutation({
  args: {
    ...companyFields,
    orgId: v.optional(v.string()),
  },
  returns: v.object({
    companyId: v.id("companies"),
    slug: v.string(),
  }),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (name.length === 0) throw new Error("Company name is required");

    if (args.orgId !== undefined) {
      const existing = await ctx.db
        .query("companies")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .unique();
      if (existing !== null) {
        throw new Error("This organization already has a company page");
      }
    }

    const slug = await uniqueCompanySlug(ctx, baseSlugFrom(name));
    const companyId = await ctx.db.insert("companies", {
      name,
      slug,
      industry: args.industry.trim(),
      size: args.size,
      location: args.location.trim(),
      about: args.about.trim(),
      websiteUrl:
        args.websiteUrl && args.websiteUrl.trim().length > 0
          ? args.websiteUrl.trim()
          : undefined,
      orgId: args.orgId,
      ownerId: me._id,
    });
    return { companyId, slug };
  },
});

/** Update a company page. Caller must administer the company. */
export const updateCompany = mutation({
  args: {
    companyId: v.id("companies"),
    ...companyFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { company } = await assertCompanyAdmin(ctx, args.companyId);
    const name = args.name.trim();
    if (name.length === 0) throw new Error("Company name is required");
    await ctx.db.patch(company._id, {
      name,
      industry: args.industry.trim(),
      size: args.size,
      location: args.location.trim(),
      about: args.about.trim(),
      websiteUrl:
        args.websiteUrl && args.websiteUrl.trim().length > 0
          ? args.websiteUrl.trim()
          : undefined,
    });
    return null;
  },
});

/**
 * Delete a company page along with its jobs, applications, and saved-job rows.
 * Caller must administer the company.
 */
export const deleteCompany = mutation({
  args: { companyId: v.id("companies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { company } = await assertCompanyAdmin(ctx, args.companyId);

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .collect();
    const jobIds = new Set(jobs.map((j) => j._id as string));
    // savedJobs has no by_job index; one scan covers every job being deleted.
    const saves = await ctx.db.query("savedJobs").collect();
    for (const save of saves) {
      if (jobIds.has(save.jobId)) await ctx.db.delete(save._id);
    }
    for (const job of jobs) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", job._id))
        .collect();
      for (const app of applications) await ctx.db.delete(app._id);
      await ctx.db.delete(job._id);
    }

    const recruiters = await ctx.db
      .query("recruiters")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    for (const r of recruiters) await ctx.db.delete(r._id);

    for (const storageId of [company.logoStorageId, company.coverImageStorageId]) {
      if (storageId !== undefined) {
        try {
          await ctx.storage.delete(storageId);
        } catch {
          // already gone
        }
      }
    }

    await ctx.db.delete(company._id);
    return null;
  },
});
