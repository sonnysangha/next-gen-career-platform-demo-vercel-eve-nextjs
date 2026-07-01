import { defineTool } from "eve/tools";
import { z } from "zod";
import { eveConvex } from "../lib/eve-helpers";

/**
 * Proposes an improved profile. The model generates the new copy and passes it in;
 * the tool attaches the user's CURRENT profile so the UI can render an old-vs-new diff.
 * No side effect — persisting happens via save_profile_draft (which requires approval).
 */
export default defineTool({
  description:
    "Propose an improved profile for a target role. You (the model) write the new headline, about section, experience bullets, suggested skills, and a short explanation; the tool returns them alongside the user's current profile for an old-vs-new comparison. Does NOT save — call save_profile_draft after the user approves.",
  inputSchema: z.object({
    targetRole: z.string(),
    headline: z.string(),
    about: z.string(),
    experienceBullets: z.array(z.string()),
    suggestedSkills: z.array(z.string()),
    explanation: z.string(),
  }),
  async execute(input, ctx) {
    const { convex, secret, clerkUserId, api } = eveConvex(ctx);
    const context = await convex.query(api.eve.getUserContext, {
      secret,
      clerkUserId,
    });

    return {
      old: {
        headline: context?.headline ?? "",
        about: context?.about ?? "",
        skills: (context?.skills ?? []).map((s) => s.name),
      },
      new: {
        targetRole: input.targetRole,
        headline: input.headline,
        about: input.about,
        experienceBullets: input.experienceBullets,
        suggestedSkills: input.suggestedSkills,
      },
      explanation: input.explanation,
    };
  },
});
