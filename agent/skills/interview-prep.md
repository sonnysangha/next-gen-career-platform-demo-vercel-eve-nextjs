---
description: Use when the user wants to prepare for an interview — likely questions, STAR stories, or company research for a specific role.
---

# Interview prep

Guidance-only playbook (no dedicated tool) for coaching the user through an upcoming
interview. Load `get_user_profile` first, and pull the target role with
`get_relevant_jobs` so prep is anchored to the real job's required skills.

## Predict the questions

- Derive likely questions straight from the job's required skills and the user's
  experience. Cover four types:
  - **Behavioral** — "Tell me about a time…" tied to the role's core competencies.
  - **Technical/role-specific** — the must-have skills from the posting.
  - **Situational** — realistic scenarios for the role's day-to-day.
  - **Motivation/fit** — why this company, why this role, why now.

## Build STAR stories

- For each key competency, help the user shape a **Situation → Task → Action →
  Result** story from their real experience, ending on a quantified result.
- Aim for 3–5 reusable stories that flex across many questions.
- If a story lacks a concrete result, ask via `ask_question` rather than inventing one.

## Cover the gaps

- Use `analyze_skill_gap` to find weak spots the interviewer will probe, and rehearse
  honest "here's how I'm closing that gap" answers.

## Their questions to ask

- Suggest 3–5 sharp questions for the user to ask the interviewer (team, success in
  90 days, challenges, growth) — specific to the company where possible.

## Logistics & delivery

- Remind them to research the company, confirm format/time, and prep concise intros.
- Coach delivery: be specific, quantify, stay concise, tie every answer back to the
  role's needs.

## Guardrails

- Ground all prep in the user's real experience and the real job. Never coach the
  user to claim skills or results they don't have.
