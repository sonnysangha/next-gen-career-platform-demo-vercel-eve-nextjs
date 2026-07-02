import assert from "node:assert/strict";
import {
  extractRelevantJobsTargetRole,
  filterJobsForAnalyzedRole,
} from "./agent-chat-helpers.ts";

const jobs = [
  { title: "Junior Frontend Developer", company: "PAPAFAM" },
  {
    title: "Next.js Platform Engineer (AI features)",
    company: "Cartograph Labs",
  },
  { title: "Full-Stack Engineer (Next.js / Convex)", company: "PAPAFAM" },
];

assert.deepEqual(
  filterJobsForAnalyzedRole(jobs, "Next.js Platform Engineer (AI features)"),
  [
    {
      title: "Next.js Platform Engineer (AI features)",
      company: "Cartograph Labs",
    },
  ],
);

assert.equal(filterJobsForAnalyzedRole(jobs, undefined), jobs);
assert.equal(filterJobsForAnalyzedRole(jobs, "Unknown role"), jobs);

assert.equal(
  extractRelevantJobsTargetRole({
    toolName: "get_relevant_jobs",
    input: { targetRole: "Next.js Platform Engineer (AI features)" },
  }),
  "Next.js Platform Engineer (AI features)",
);
