import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { eveConvex } from "../lib/eve-helpers";

export default defineTool({
  description:
    "Save an improved profile as a draft on the user's account. Requires human approval before it runs. Call this only after presenting the rewrite and the user wants to save it.",
  inputSchema: z.object({
    headline: z.string(),
    about: z.string(),
    experienceBullets: z.array(z.string()),
    suggestedSkills: z.array(z.string()),
    explanation: z.string(),
    targetRole: z.string().optional(),
  }),
  approval: always(),
  async execute(input, ctx) {
    const { convex, secret, clerkUserId, api } = eveConvex(ctx);
    const draftId = await convex.mutation(api.eve.saveProfileDraft, {
      secret,
      clerkUserId,
      ...input,
    });
    await convex.mutation(api.eve.recordAiRun, {
      secret,
      clerkUserId,
      feature: "profile_optimizer",
      status: "saved",
    });
    return { saved: true as const, draftId };
  },
});
