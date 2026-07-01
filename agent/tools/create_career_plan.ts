import { defineTool } from "eve/tools";
import { z } from "zod";

const phase = z.object({
  period: z.enum(["30", "60", "90"]),
  focus: z.string(),
  milestones: z.array(z.string()),
});

/**
 * Structures a 30/60/90-day career plan the model has written, for card rendering.
 * No side effect — persist via save_career_plan (requires approval).
 */
export default defineTool({
  description:
    "Structure a 30/60/90-day career plan you've written toward the user's goal: phased focus areas + milestones, weekly milestones, project ideas, skills to learn, and which jobs to apply to first. Returns it for review. Does NOT save — call save_career_plan after the user approves.",
  inputSchema: z.object({
    goal: z.string(),
    summary: z.string().optional(),
    phases: z.array(phase).length(3),
    weeklyMilestones: z.array(z.string()),
    projectIdeas: z.array(z.string()),
    skillsToLearn: z.array(z.string()),
    jobsToApplyFirst: z.array(z.string()),
  }),
  async execute(input) {
    return { plan: input };
  },
});
