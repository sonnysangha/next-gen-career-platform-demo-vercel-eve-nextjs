import { defineTool } from "eve/tools";
import { z } from "zod";
import { eveConvex } from "../lib/eve-helpers";

function norm(s: string) {
  return s.trim().toLowerCase();
}

export default defineTool({
  description:
    "Rank real jobs in CareerConnect for the signed-in user by how well their skills match. Returns each job with a match score (0-100), the required skills, and the skills the user is missing. Use this to recommend which jobs to apply for.",
  inputSchema: z.object({
    targetRole: z
      .string()
      .optional()
      .describe("Optional target role to bias ranking, e.g. 'Next.js AI Engineer'."),
    limit: z.number().int().min(1).max(25).optional().default(8),
  }),
  async execute({ targetRole, limit }, ctx) {
    const { convex, secret, clerkUserId, api } = eveConvex(ctx);

    const [context, jobs] = await Promise.all([
      convex.query(api.eve.getUserContext, { secret, clerkUserId }),
      convex.query(api.eve.getAllJobsForMatching, { secret, clerkUserId }),
    ]);

    const userSkills = new Set((context?.skills ?? []).map((s) => norm(s.name)));
    const role = norm(targetRole ?? context?.targetRole ?? "");

    const ranked = jobs
      .map((job) => {
        const required = job.skillsRequired ?? [];
        const matched = required.filter((s) => userSkills.has(norm(s)));
        const missing = required.filter((s) => !userSkills.has(norm(s)));
        const skillScore = required.length
          ? matched.length / required.length
          : 0;
        const roleBoost =
          role && norm(job.title).includes(role.split(" ")[0] ?? "") ? 0.15 : 0;
        const score = Math.min(
          100,
          Math.round((skillScore * 0.85 + roleBoost) * 100)
        );
        return {
          jobId: job.jobId,
          title: job.title,
          company: job.company,
          seniority: job.seniority,
          workMode: job.workMode,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
          matchScore: score,
          requiredSkills: required,
          matchedSkills: matched,
          missingSkills: missing,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return { count: ranked.length, jobs: ranked };
  },
});
