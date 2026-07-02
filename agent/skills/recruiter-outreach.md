---
description: Use when the user wants to write a connection request, recruiter DM, or intro message about a specific job or company.
---

# Recruiter outreach

Playbook for drafting outreach with `create_outreach_draft`. Load `get_user_profile`
first, and pull the specific role with `get_relevant_jobs` so the message references
the real job title, company, and required skills.

## Connection message (short note, <= ~300 chars)

- One reason you're reaching out + one specific hook tying you to them/the role.
- Reference something concrete: the exact job, the company's work, a shared skill.
- No pitch, no résumé dump. The goal is only to get the connection accepted.
- Warm and human. End open, e.g. "Would love to connect."

## Recruiter DM (longer)

- Structure: hook → who you are in one line → why you fit this role (2–3 proof
  points tied to the job's required skills) → clear, low-friction ask → thanks.
- Mirror the job's language for must-have skills the user actually has.
- Keep it skimmable: 4–6 short sentences or a couple tight bullets, not a wall.
- One clear call to action (a quick chat, sharing a résumé, next steps).

## Subject line (if email)

- 4–8 words, specific: role + hook. e.g. "Senior RN — 6 yrs ICU, relocating to Austin".
- No clickbait, no all-caps.

## Tone

- Respect the requested `tone` (warm / concise / formal). Default to warm-but-brief.
- Match seniority: peer-to-peer for ICs, more formal for exec/agency recruiters.

## Guardrails

- Ground claims in the user's real experience and the real job — no invented metrics
  or titles. If a key detail is missing, ask via `ask_question`.
- You draft only. Never claim to have sent, emailed, or applied on their behalf.
- `create_outreach_draft` does NOT save. Show it, then call `save_outreach_draft`
  only after the user approves.
