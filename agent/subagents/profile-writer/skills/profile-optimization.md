---
description: Use when drafting a profile rewrite — headline, about section, experience bullets, and suggested skills — for a target role.
---

# Profile optimization

Playbook for producing a strong profile rewrite with `create_profile_rewrite`.
Always load the user's real data with `get_user_profile` first, and, for a target
role, `analyze_skill_gap` so the rewrite leans into real strengths.

## Headline

- Formula: `Role/specialty · What you do for whom · Signature proof or stack`.
- Lead with the target role's language, not the current title, when they're pivoting.
- Fit the value in ~120 chars; no "aspiring", "guru", "ninja", or emoji soup.
- Front-load the keyword a recruiter would search for.

## About section

- First two lines are the hook — they show before "see more". Open with the outcome
  the user drives, not a life story.
- Structure: hook → what they do and for whom → 2–3 proof points with metrics →
  what they're looking for → light call to action.
- Write in first person, plain sentences, active voice. Cut adjectives that aren't
  backed by evidence.
- Seed the real skills and tools from their profile so search surfaces them.

## Experience bullets

- One accomplishment per bullet: `Action verb → what → measurable result`.
- Quantify wherever the data exists (%, $, time saved, scale, users). If there's no
  number, keep the bullet outcome-focused and note the assumption in `explanation`
  rather than inventing a figure.
- Rewrite duty-lists ("responsible for…") into outcomes.
- Order bullets by relevance to the target role, strongest first.

## Suggested skills

- Recommend skills that (a) the user genuinely has and (b) appear in the target
  role's requirements — cross-reference `analyze_skill_gap` output.
- Flag genuine gaps as "skills to build", not as claimed skills.

## Explanation

- In the `explanation` field, say what changed and why in 2–4 tight bullets so the
  old-vs-new diff is easy to scan. Note any assumptions you made.

## Guardrails

- Never fabricate titles, dates, metrics, or skills. Ground everything in real data.
- You draft only. `create_profile_rewrite` does NOT save, and you have no save tool —
  return the draft for the parent agent to review, approve, and persist.
