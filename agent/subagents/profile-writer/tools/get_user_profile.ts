// Declared subagents don't inherit the root's tools, so re-export the shared
// implementation. The filename is the tool name in this subagent's namespace.
export { default } from "../../../tools/get_user_profile";
