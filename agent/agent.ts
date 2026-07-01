import { defineAgent } from "eve";

/**
 * CareerConnect AI Career Agent.
 * Runs on Sonnet 5 through the Vercel AI Gateway (AI_GATEWAY_API_KEY).
 */
export default defineAgent({
  model: "anthropic/claude-sonnet-5",
  reasoning: "medium",
});
