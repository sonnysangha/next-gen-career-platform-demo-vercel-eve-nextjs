import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { eveConvex } from "../lib/eve-helpers";

const phase = z.object({
  period: z.enum(["30", "60", "90"]),
  focus: z.string(),
  milestones: z.array(z.string()),
});

export default defineTool({
  description:
    "Save a 30/60/90-day career plan to the user's dashboard. Requires human approval before it runs.",
  inputSchema: z.object({
    goal: z.string(),
    summary: z.string().optional(),
    phases: z.array(phase).length(3),
    weeklyMilestones: z.array(z.string()),
    projectIdeas: z.array(z.string()),
    skillsToLearn: z.array(z.string()),
    jobsToApplyFirst: z.array(z.string()),
  }),
  approval: always(),
  async execute(input, ctx) {
    const { convex, secret, clerkUserId, api } = eveConvex(ctx);
    const planId = await convex.mutation(api.eve.saveCareerPlan, {
      secret,
      clerkUserId,
      ...input,
    });
    await convex.mutation(api.eve.recordAiRun, {
      secret,
      clerkUserId,
      feature: "career_plan",
      status: "saved",
    });
    return { saved: true as const, planId };
  },
});
