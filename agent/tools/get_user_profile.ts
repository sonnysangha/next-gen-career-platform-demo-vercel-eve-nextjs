import { defineTool } from "eve/tools";
import { z } from "zod";
import { eveConvex } from "../lib/eve-helpers";

export default defineTool({
  description:
    "Load the signed-in user's profile: headline, about, location, target role, experience, skills, and saved jobs. Call this first before giving any advice.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const { convex, secret, clerkUserId, api } = eveConvex(ctx);
    const context = await convex.query(api.eve.getUserContext, {
      secret,
      clerkUserId,
    });
    if (!context) {
      return { found: false as const, message: "No profile found for this user yet." };
    }
    return { found: true as const, profile: context };
  },
});
