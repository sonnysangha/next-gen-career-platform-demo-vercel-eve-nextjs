type ToolPartLike = {
  toolName?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
};

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getStringField(value: unknown, field: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fieldValue = (value as Record<string, unknown>)[field];
  return typeof fieldValue === "string" ? fieldValue : undefined;
}

export function extractAnalyzedJobTitle(parts: ToolPartLike[]) {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (part.toolName !== "analyze_skill_gap") continue;
    return (
      getStringField(part.output, "jobTitle") ??
      getStringField(part.result, "jobTitle") ??
      getStringField(part.input, "jobTitle")
    );
  }
  return undefined;
}

export function extractRelevantJobsTargetRole(part: ToolPartLike) {
  if (part.toolName !== "get_relevant_jobs") return undefined;
  return getStringField(part.input, "targetRole");
}

export function filterJobsForAnalyzedRole<T extends { title?: string | null }>(
  jobs: T[],
  analyzedJobTitle?: string | null,
) {
  if (!analyzedJobTitle) return jobs;

  const analyzed = normalizeTitle(analyzedJobTitle);
  const matches = jobs.filter((job) => {
    if (!job.title) return false;
    return normalizeTitle(job.title) === analyzed;
  });

  return matches.length > 0 ? matches : jobs;
}
