import { defineAgent } from "eve";

/**
 * Profile rewrite specialist. The root agent delegates the focused, writing-heavy
 * task of producing a polished profile rewrite for a target role. It generates the
 * new copy via create_profile_rewrite and returns the proposed draft; it never saves.
 * Saving stays with the root, which owns the human-approval step.
 */
export default defineAgent({
  description:
    "Profile rewrite specialist. Delegate to it to draft an improved headline, about section, experience bullets, and suggested skills for a target role. Pass the target role (and any emphasis) in `message`. It returns the proposed rewrite alongside the current profile for an old-vs-new diff. It does NOT save — the parent handles approval and save_profile_draft.",
  model: "anthropic/claude-sonnet-5",
  reasoning: "medium",
});
