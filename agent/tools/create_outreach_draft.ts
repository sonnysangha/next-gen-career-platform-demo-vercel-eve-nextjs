import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * Structures a recruiter-outreach draft the model has written, for card rendering.
 * No side effect — persist via save_outreach_draft (requires approval).
 */
export default defineTool({
  description:
    "Structure an outreach draft you've written for a specific job/recruiter: a short connection message, a longer recruiter DM, and an optional subject line. Returns them for review. Does NOT save — call save_outreach_draft after the user approves.",
  inputSchema: z.object({
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    recruiterName: z.string().optional(),
    tone: z.string().optional().describe("e.g. 'warm', 'concise', 'formal'"),
    connectionMessage: z.string().describe("Short note (<= ~300 chars) for a connection request."),
    recruiterDm: z.string().describe("Longer direct message to the recruiter."),
    subject: z.string().optional().describe("Subject line if sending as an email."),
  }),
  async execute(input) {
    return { draft: input };
  },
});
