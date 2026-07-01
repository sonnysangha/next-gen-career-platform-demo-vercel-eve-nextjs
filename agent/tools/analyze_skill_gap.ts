import { defineTool } from "eve/tools";
import { z } from "zod";
import { eveConvex } from "../lib/eve-helpers";

function norm(s: string) {
  return s.trim().toLowerCase();
}

export default defineTool({
  description:
    "Compare the signed-in user's real skills against a target job's required skills. Returns matched skills (strengths), missing skills (gaps), and a coverage score. Pass the target job's title and required skills (you can get these from get_relevant_jobs).",
  inputSchema: z.object({
    jobTitle: z.string(),
    requiredSkills: z.array(z.string()).min(1),
  }),
  async execute({ jobTitle, requiredSkills }, ctx) {
    const { convex, secret, clerkUserId, api } = eveConvex(ctx);
    const context = await convex.query(api.eve.getUserContext, {
      secret,
      clerkUserId,
    });

    const userSkills = (context?.skills ?? []).map((s) => s.name);
    const userSet = new Set(userSkills.map(norm));

    const matched = requiredSkills.filter((s) => userSet.has(norm(s)));
    const missing = requiredSkills.filter((s) => !userSet.has(norm(s)));
    const coverage = Math.round((matched.length / requiredSkills.length) * 100);

    return {
      jobTitle,
      coverage,
      strengths: matched,
      gaps: missing,
      userSkills,
      currentHeadline: context?.headline ?? null,
      currentTargetRole: context?.targetRole ?? null,
    };
  },
});
