"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEveAgent } from "eve/react";
import { Sparkles, Send, Check, X, CircleHelp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ai/markdown";
import { cn } from "@/lib/utils";
import {
  extractAnalyzedJobTitle,
  extractRelevantJobsTargetRole,
  filterJobsForAnalyzedRole,
} from "./agent-chat-helpers";

const SUGGESTED = [
  "Improve my profile for Next.js AI Engineer roles",
  "Which jobs should I apply for first?",
  "Draft outreach for a recruiter at one of my saved jobs",
  "Create a 90-day plan to become a Next.js AI Engineer",
];

// Loose part typing — Eve parts follow the AI SDK UIMessage convention plus
// eve tool metadata; we read fields defensively.
type AnyPart = {
  type: string;
  text?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  toolMetadata?: { eve?: { inputRequest?: InputRequest } };
};
type Job = {
  jobId?: string;
  title?: string;
  company?: string;
  seniority?: string;
  workMode?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  matchScore?: number;
  requiredSkills?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
};
type InputRequest = {
  requestId: string;
  prompt?: string;
  options?: { id: string; label?: string; description?: string }[];
  allowFreeform?: boolean;
};

export function AgentChat() {
  const params = useSearchParams();
  const agent = useEveAgent();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  const busy = agent.status === "submitted" || agent.status === "streaming";

  // Auto-run a prompt passed via ?prompt= (deep links from Jobs/Profile/Outreach).
  useEffect(() => {
    const prompt = params.get("prompt");
    if (prompt && !autoSent.current) {
      autoSent.current = true;
      void agent.send({ message: prompt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agent.data.messages, agent.status]);

  function submit(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    void agent.send({ message: msg });
  }

  async function answer(requestId: string, optionId: string) {
    await agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  const messages = agent.data.messages as unknown as {
    id: string;
    role: string;
    parts: AnyPart[];
  }[];
  const hasMessages = messages.length > 0;

  // Show a "Thinking" indicator whenever the agent is working and hasn't started
  // streaming visible text yet (covers submitted + tool-running phases).
  const lastMessage = messages[messages.length - 1];
  const streamingText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (p) => p.type === "text" && p.text && p.text.length > 0,
    );
  const showThinking = busy && !streamingText;

  return (
    <div className="flex h-[calc(100svh-7rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {!hasMessages && (
          <div className="mx-auto max-w-lg pt-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">Your AI Career Agent</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask about your profile, jobs, outreach, or a career plan. I read
              your real CareerConnect data and ask before saving anything.
            </p>
            <div className="mt-5 grid gap-2 text-left">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-lg border bg-card p-3 text-sm transition-colors hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const analyzedJobTitle = extractAnalyzedJobTitle(message.parts);

          return (
            <div key={message.id}>
              {message.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                    {message.parts
                      .filter((p) => p.type === "text")
                      .map((p, i) => (
                        <p key={i} className="whitespace-pre-wrap">
                          {p.text}
                        </p>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {message.parts.map((part, i) => (
                      <PartView
                        key={i}
                        part={part}
                        busy={busy}
                        analyzedJobTitle={analyzedJobTitle}
                        onAnswer={answer}
                        onFreeform={submit}
                      />
                    ))}
                    {message.id === lastMessage?.id && showThinking && (
                      <ThinkingDots />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {showThinking && lastMessage?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <ThinkingDots />
          </div>
        )}

        {agent.status === "error" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {agent.error?.message ?? "Something went wrong."}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-background pt-3">
        {hasMessages && (
          <div className="mb-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                agent.reset();
                autoSent.current = true;
              }}
            >
              New chat
            </Button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask your career agent…"
            className="max-h-40 min-h-11 resize-none"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={busy || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  get_user_profile: "Read your profile",
  get_relevant_jobs: "Matched jobs to your skills",
  analyze_skill_gap: "Analyzed your skill gap",
  create_profile_rewrite: "Drafted a profile rewrite",
  create_outreach_draft: "Drafted outreach",
  create_career_plan: "Drafted a career plan",
  // Declared subagents surface as tool calls by their bare directory name.
  "job-scout": "Scouting best-fit jobs",
  "profile-writer": "Writing your profile rewrite",
};

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 pt-1.5 text-sm text-muted-foreground">
      <span>Thinking</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
      </span>
    </div>
  );
}

function PartView({
  part,
  busy,
  onAnswer,
  onFreeform,
  analyzedJobTitle,
}: {
  part: AnyPart;
  busy: boolean;
  analyzedJobTitle?: string;
  onAnswer: (requestId: string, optionId: string) => void;
  onFreeform: (text: string) => void;
}) {
  if (part.type === "text" && part.text) {
    return <Markdown>{part.text}</Markdown>;
  }

  if (part.type === "dynamic-tool") {
    const request = part.toolMetadata?.eve?.inputRequest;
    if (request) {
      const isApproval =
        part.toolName?.startsWith("save_") ||
        (request.options?.some((o) =>
          /^(approve|deny|allow|reject)$/i.test(o.id),
        ) ??
          false);
      return isApproval ? (
        <ApprovalCard
          part={part}
          request={request}
          busy={busy}
          onAnswer={onAnswer}
        />
      ) : (
        <QuestionCard
          request={request}
          busy={busy}
          onAnswer={onAnswer}
          onFreeform={onFreeform}
        />
      );
    }
    // Rich job cards once ranked matches arrive from get_relevant_jobs.
    if (part.toolName === "get_relevant_jobs") {
      const jobs = extractJobs(part.output ?? part.result);
      const targetRole =
        analyzedJobTitle ?? extractRelevantJobsTargetRole(part);
      const visibleJobs = filterJobsForAnalyzedRole(jobs, targetRole);
      if (visibleJobs.length > 0) return <JobCards jobs={visibleJobs} />;
    }

    // Tool / subagent activity — a subtle chip, only for known tools. Show a
    // spinner while it's still running and a check once it has output, so the
    // "Thinking" phase shows visible progress (including subagent delegation).
    const label = part.toolName ? TOOL_LABELS[part.toolName] : undefined;
    if (!label) return null;
    const done = part.state === "output-available" || !busy;
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
        {done ? (
          <Check className="h-3 w-3 text-primary" />
        ) : (
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        )}
        {label}
      </div>
    );
  }

  return null;
}

function QuestionCard({
  request,
  busy,
  onAnswer,
  onFreeform,
}: {
  request: InputRequest;
  busy: boolean;
  onAnswer: (requestId: string, optionId: string) => void;
  onFreeform: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const options = request.options ?? [];
  const allowFreeform = request.allowFreeform ?? options.length === 0;

  function sendFreeform() {
    const t = text.trim();
    if (!t) return;
    setText("");
    onFreeform(t);
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <CircleHelp className="h-4 w-4 text-primary" />
        Quick question
      </p>
      {request.prompt && <p className="mt-1 text-sm">{request.prompt}</p>}

      {options.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={busy}
              onClick={() => onAnswer(request.requestId, opt.id)}
              className="rounded-lg border bg-background p-2.5 text-left text-sm transition-colors hover:border-primary/50 disabled:opacity-50"
            >
              <span className="font-medium">{opt.label ?? opt.id}</span>
              {opt.description && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {opt.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {allowFreeform && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendFreeform();
            }}
            placeholder="Type your answer…"
            className="h-9"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={busy || !text.trim()}
            onClick={sendFreeform}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function humanize(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Human-readable preview of what a save_* tool is about to persist. */
function ApprovalPreview({ input }: { input: unknown }) {
  if (!input || typeof input !== "object") return null;
  const entries = Object.entries(input as Record<string, unknown>).filter(
    ([k, v]) => v != null && v !== "" && !/^(jobId|recruiterId)$/.test(k),
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 space-y-2.5 rounded-lg bg-background p-3 text-sm">
      {entries.map(([k, v]) => (
        <div key={k}>
          <p className="text-xs font-medium text-muted-foreground">
            {humanize(k)}
          </p>
          {Array.isArray(v) ? (
            v.length > 0 && typeof v[0] === "object" ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {(v as Record<string, unknown>[]).map((it, i) => (
                  <li key={i}>
                    {it.period
                      ? `${String(it.period)}-day — ${String(it.focus ?? "")}`
                      : JSON.stringify(it)}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {(v as unknown[]).map((s, i) => (
                  <span
                    key={i}
                    className="rounded bg-muted px-1.5 py-0.5 text-xs"
                  >
                    {String(s)}
                  </span>
                ))}
              </div>
            )
          ) : (
            <p className="whitespace-pre-wrap">{String(v)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ApprovalCard({
  request,
  busy,
  onAnswer,
  part,
}: {
  request: InputRequest;
  busy: boolean;
  onAnswer: (requestId: string, optionId: string) => void;
  part: AnyPart;
}) {
  const options = request.options?.length
    ? request.options
    : [
        { id: "approve", label: "Approve & save" },
        { id: "deny", label: "Reject" },
      ];

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        Approval needed
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {request.prompt ?? "Save this to your account?"}
      </p>

      <ApprovalPreview input={part.input} />

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => {
          const isApprove = /approve|allow|yes|save/i.test(opt.id);
          return (
            <Button
              key={opt.id}
              size="sm"
              variant={isApprove ? "default" : "outline"}
              disabled={busy}
              onClick={() => onAnswer(request.requestId, opt.id)}
              className="gap-1.5"
            >
              {isApprove ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              {opt.label ?? opt.id}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function extractJobs(output: unknown): Job[] {
  if (!output || typeof output !== "object") return [];
  const jobs = (output as { jobs?: unknown }).jobs;
  return Array.isArray(jobs) ? (jobs as Job[]) : [];
}

function formatSalary(job: Job): string | null {
  const { salaryMin, salaryMax, currency } = job;
  if (salaryMin == null && salaryMax == null) return null;
  const prefix = !currency || currency === "USD" ? "$" : `${currency} `;
  const k = (n: number) => `${prefix}${Math.round(n / 1000)}K`;
  if (salaryMin != null && salaryMax != null)
    return `${k(salaryMin)}–${k(salaryMax)}`;
  return k((salaryMin ?? salaryMax) as number);
}

function JobCards({ jobs }: { jobs: Job[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {jobs.map((job, i) => (
        <JobCard key={job.jobId ?? i} job={job} />
      ))}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const score = job.matchScore ?? 0;
  const scoreClass =
    score >= 60
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  const meta = [
    job.location,
    job.workMode,
    job.seniority,
    formatSalary(job),
  ].filter(Boolean);

  const cardClass =
    "group flex flex-col rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold group-hover:underline">
            {job.title ?? "Untitled role"}
          </p>
          {job.company && (
            <p className="truncate text-xs text-muted-foreground">
              {job.company}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            scoreClass,
          )}
        >
          {score}% match
        </span>
      </div>

      {meta.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{meta.join(" · ")}</p>
      )}

      {(job.matchedSkills?.length ?? 0) > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Matched
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {job.matchedSkills!.map((s) => (
              <span
                key={s}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {(job.missingSkills?.length ?? 0) > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            Missing
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {job.missingSkills!.map((s) => (
              <span
                key={s}
                className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-xs text-red-700 dark:text-red-400"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // Link into the Jobs page detail view (?job=<id>) when we have the id.
  if (job.jobId) {
    return (
      <Link href={`/jobs?job=${job.jobId}`} className={cardClass}>
        {content}
      </Link>
    );
  }
  return <div className={cardClass}>{content}</div>;
}
