import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { eveConvex } from "../lib/eve-helpers";

export default defineTool({
  description:
    "Save a recruiter-outreach draft to the user's account. Requires human approval before it runs. Optionally link it to a jobId and/or recruiterId (Convex ids) when known.",
  inputSchema: z.object({
    jobId: z.string().optional(),
    recruiterId: z.string().optional(),
    tone: z.string().optional(),
    connectionMessage: z.string(),
    recruiterDm: z.string(),
    subject: z.string().optional(),
  }),
  approval: always(),
  async execute(input, ctx) {
    const { convex, secret, clerkUserId, api } = eveConvex(ctx);
    const draftId = await convex.mutation(api.eve.saveOutreachDraft, {
      secret,
      clerkUserId,
      ...input,
    });
    await convex.mutation(api.eve.recordAiRun, {
      secret,
      clerkUserId,
      feature: "outreach_writer",
      status: "saved",
    });
    return { saved: true as const, draftId };
  },
});
