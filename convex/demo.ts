import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getUserByIdentity, getProfileForUser } from "./model";

/**
 * Demo helper: turn the CURRENTLY signed-in user into "Alex Carter".
 *
 * The app uses real Clerk sign-in, so we can't literally authenticate as a
 * seeded network user. Instead, the presenter signs in with their own Clerk
 * account and calls api.demo.becomeAlex to overwrite their CareerConnect data
 * with the handcrafted "weak" Alex profile — a strong frontend dev with real
 * React/Next.js chops but conspicuous AI gaps, primed for the AI features to
 * shine. Idempotent: safe to click repeatedly.
 *
 * Called from the client as:
 *   const becomeAlex = useMutation(api.demo.becomeAlex);
 *   await becomeAlex({});
 */

// ── Alex Carter canonical constants (tweak here) ─────────────────────

const ALEX = {
  name: "Alex Carter",
  username: "alex-carter",
  profile: {
    headline: "Frontend Developer | React enthusiast",
    about:
      "Frontend developer who loves building clean, responsive UIs with React and Next.js. Passionate about pixel-perfect design and great user experience. Always looking to learn and grow.",
    location: "London, UK",
    targetRole: "Next.js AI Engineer",
    openToWork: true,
  },
  experiences: [
    {
      title: "Frontend Developer",
      company: "Brightwave Health",
      companySlug: "brightwave-health", // linked to the seeded company page
      startDate: "2022-03",
      endDate: undefined, // present
      description:
        "Build and maintain the patient-facing web app in React and Next.js. Ship responsive, accessible UI with TypeScript and Tailwind CSS, and collaborate closely with design.",
      location: "London, UK",
    },
    {
      title: "Junior Frontend Developer",
      company: "Palette Studio",
      companySlug: "palette-studio",
      startDate: "2020-06",
      endDate: "2022-02",
      description:
        "Developed reusable React component libraries and marketing pages. Improved Lighthouse performance scores and championed a move to TypeScript.",
      location: "London, UK",
    },
  ],
  education: [
    {
      school: "University of Manchester",
      degree: "BSc",
      field: "Computer Science",
      startYear: "2016",
      endYear: "2020",
      description:
        "First-class honours. Final-year project: a real-time collaborative whiteboard in React.",
    },
  ],
  // A live application so /applications has data out of the box.
  appliedJobTitle: "Full Stack AI Developer",
  // Strong frontend skills, deliberately NO AI skills so gaps are obvious.
  skills: [
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "CSS",
    "Tailwind CSS",
    "HTML",
  ],
  // Pre-existing weak outreach draft to demonstrate "before".
  weakOutreach: {
    tone: "generic",
    connectionMessage:
      "Hi, I'd like to add you to my professional network on CareerConnect.",
    recruiterDm:
      "Hello, I saw you're hiring and I'm interested in the role. I have frontend experience. Let me know if we can chat. Thanks!",
    subject: "Interested in your open role",
  },
  // The strong job we auto-save for Alex (looked up by title).
  savedJobTitle: "AI Engineer",
} as const;

export const becomeAlex = mutation({
  args: {},
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) {
      throw new Error("Not authenticated — sign in before running the demo");
    }

    // ── 1) users row: name + username (only claim "alex-carter" if free) ──
    const userPatch: { name: string; username?: string } = { name: ALEX.name };
    if (me.username !== ALEX.username) {
      const clash = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", ALEX.username))
        .unique();
      // Take the username only if nobody else (i.e. no *other* row) holds it.
      if (clash === null) {
        userPatch.username = ALEX.username;
      }
    }
    await ctx.db.patch(me._id, userPatch);

    // ── 2) profile: overwrite to the weak Alex profile (upsert) ──
    const existingProfile = await getProfileForUser(ctx, me._id);
    if (existingProfile === null) {
      await ctx.db.insert("profiles", {
        userId: me._id,
        headline: ALEX.profile.headline,
        about: ALEX.profile.about,
        location: ALEX.profile.location,
        targetRole: ALEX.profile.targetRole,
        openToWork: ALEX.profile.openToWork,
        coverImageUrl: undefined,
      });
    } else {
      await ctx.db.patch(existingProfile._id, {
        headline: ALEX.profile.headline,
        about: ALEX.profile.about,
        location: ALEX.profile.location,
        targetRole: ALEX.profile.targetRole,
        openToWork: ALEX.profile.openToWork,
      });
    }

    // ── 3) experiences: replace wholesale, linked to seeded company pages ──
    const oldExperiences = await ctx.db
      .query("experiences")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    for (const exp of oldExperiences) {
      await ctx.db.delete(exp._id);
    }
    for (const exp of ALEX.experiences) {
      const linkedCompany = await ctx.db
        .query("companies")
        .withIndex("by_slug", (q) => q.eq("slug", exp.companySlug))
        .unique();
      await ctx.db.insert("experiences", {
        userId: me._id,
        title: exp.title,
        company: exp.company,
        companyId: linkedCompany?._id,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
        location: exp.location,
      });
    }

    // ── 3b) education: replace wholesale ──
    const oldEducation = await ctx.db
      .query("education")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    for (const edu of oldEducation) {
      await ctx.db.delete(edu._id);
    }
    for (const edu of ALEX.education) {
      await ctx.db.insert("education", {
        userId: me._id,
        school: edu.school,
        degree: edu.degree,
        field: edu.field,
        startYear: edu.startYear,
        endYear: edu.endYear,
        description: edu.description,
      });
    }

    // ── 4) skills: replace wholesale (strong frontend, no AI) ──
    const oldSkills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    for (const skill of oldSkills) {
      await ctx.db.delete(skill._id);
    }
    for (const skillName of ALEX.skills) {
      await ctx.db.insert("skills", {
        userId: me._id,
        name: skillName,
        endorsements: 0,
      });
    }

    // ── 5) save ONE strong job ("AI Engineer") if it exists and isn't saved ──
    // jobs has no by_title index (title isn't a lookup key in the schema), so
    // scan for the first match. The jobs table is small (seeded ~50 rows).
    let targetJob = null;
    for await (const job of ctx.db.query("jobs")) {
      if (job.title === ALEX.savedJobTitle) {
        targetJob = job;
        break;
      }
    }
    if (targetJob !== null) {
      const already = await ctx.db
        .query("savedJobs")
        .withIndex("by_user_and_job", (q) =>
          q.eq("userId", me._id).eq("jobId", targetJob!._id),
        )
        .unique();
      if (already === null) {
        await ctx.db.insert("savedJobs", {
          userId: me._id,
          jobId: targetJob._id,
          savedAt: Date.now(),
        });
      }
    }

    // ── 5b) one live application ("Full Stack AI Developer") so the
    //        /applications page has data. Idempotent via by_user_and_job. ──
    let appliedJob = null;
    for await (const job of ctx.db.query("jobs")) {
      if (job.title === ALEX.appliedJobTitle && job.status !== "closed") {
        appliedJob = job;
        break;
      }
    }
    if (appliedJob !== null) {
      const existingApplication = await ctx.db
        .query("applications")
        .withIndex("by_user_and_job", (q) =>
          q.eq("userId", me._id).eq("jobId", appliedJob!._id),
        )
        .unique();
      if (existingApplication === null) {
        await ctx.db.insert("applications", {
          jobId: appliedJob._id,
          userId: me._id,
          companyId: appliedJob.companyId,
          coverNote:
            "Hi! I'm a frontend developer with strong React/Next.js experience, working toward AI engineering. I'd love to bring my UI craft to your team while going deep on the AI SDK.",
          status: "submitted",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // ── 6) one pre-existing weak outreach draft (idempotent) ──
    const existingDrafts = await ctx.db
      .query("outreachDrafts")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    const hasWeakDraft = existingDrafts.some(
      (d) => d.connectionMessage === ALEX.weakOutreach.connectionMessage,
    );
    if (!hasWeakDraft) {
      await ctx.db.insert("outreachDrafts", {
        userId: me._id,
        jobId: targetJob?._id,
        recruiterId: undefined,
        tone: ALEX.weakOutreach.tone,
        connectionMessage: ALEX.weakOutreach.connectionMessage,
        recruiterDm: ALEX.weakOutreach.recruiterDm,
        subject: ALEX.weakOutreach.subject,
        status: "draft",
        createdAt: Date.now(),
      });
    }

    return { ok: true };
  },
});
