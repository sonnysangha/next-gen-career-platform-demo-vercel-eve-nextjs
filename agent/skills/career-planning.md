---
description: Use when the user wants a career plan, roadmap, or 30/60/90-day plan toward a goal or target role.
---

# Career planning

Playbook for building a 30/60/90-day plan with `create_career_plan`. Load
`get_user_profile` first for goals, skills, and saved jobs; use `get_relevant_jobs`
to ground `jobsToApplyFirst` and `analyze_skill_gap` to ground `skillsToLearn`.

## Set the goal

- State a concrete `goal` — a specific target role/level, not "grow my career".
- If the user's goal is vague, ask one focused `ask_question` with 2–4 role options
  drawn from the real jobs in the system.

## Phase the plan (exactly 3 phases: 30 / 60 / 90)

- **30 — Foundation:** close the highest-leverage skill gaps, polish the profile,
  warm up outreach. Milestones are learning + setup, not applications.
- **60 — Build & prove:** ship a portfolio project, earn a credential, start
  targeted applications and outreach.
- **90 — Land:** interview at scale, negotiate, convert. Milestones are pipeline
  and offers.
- Each phase: a clear `focus` line + 2–4 concrete `milestones`.

## Weekly milestones

- Small, checkable, time-bound (e.g. "Week 3: finish React course, ship 1 demo").
- Keep them realistic against the user's available time — ask if unknown.

## Project ideas

- 2–4 projects that directly demonstrate the target role's must-have skills and
  become portfolio/résumé proof points.

## Skills to learn

- Pull the top missing skills from `analyze_skill_gap`, ordered by impact on the
  target role. Prioritize ruthlessly — 3–5, not a laundry list.

## Jobs to apply first

- Real postings from `get_relevant_jobs`, highest match first. Note why each is a
  strong early target.

## Guardrails

- Ground every item in the user's real data and the real jobs in the system.
- Be honest about stretch goals: if there's a gap, show it in the plan instead of
  glossing over it.
- `create_career_plan` does NOT save. Show it, then call `save_career_plan` only
  after the user approves.
