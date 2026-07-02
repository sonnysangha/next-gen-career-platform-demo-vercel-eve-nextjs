import { defineAgent } from "eve";

/**
 * Read-only job market research specialist. The root agent delegates
 * "find and analyze the best-fit jobs" to keep heavy ranking/gap work out of
 * the main conversation context. Returns a structured shortlist; it never saves
 * anything and never talks to the user directly.
 */
export default defineAgent({
  description:
    "Read-only job scout. Delegate to it to find, rank, and gap-analyze the best-fit real jobs for the signed-in user. Give it the user's target role/constraints in `message`; it returns a structured shortlist with match scores, matched skills, and missing skills. It does not save or message the user.",
  model: "anthropic/claude-sonnet-5",
  reasoning: "low",
});
