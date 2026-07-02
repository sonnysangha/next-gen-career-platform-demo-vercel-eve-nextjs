import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getUserByIdentity,
  getProfileForUser,
  notify,
  userDocValidator,
  profileDocValidator,
  experienceDocValidator,
  educationDocValidator,
  skillDocValidator,
  postDocValidator,
} from "./model";

/**
 * Public profile page payload: user + profile + experiences + education +
 * skills (with endorsedByMe) + recent posts. Returns null when no user has
 * that username.
 */
export const getProfileByUsername = query({
  args: { username: v.string() },
  returns: v.union(
    v.object({
      user: userDocValidator,
      profile: v.union(profileDocValidator, v.null()),
      experiences: v.array(experienceDocValidator),
      education: v.array(educationDocValidator),
      skills: v.array(
        v.object({
          ...skillDocValidator.fields,
          endorsedByMe: v.boolean(),
        }),
      ),
      recentPosts: v.array(postDocValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (user === null) return null;

    const me = await getUserByIdentity(ctx);
    const profile = await getProfileForUser(ctx, user._id);

    const experiences = await ctx.db
      .query("experiences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    // Newest first (present roles on top). "YYYY-MM" sorts lexicographically.
    experiences.sort((a, b) => b.startDate.localeCompare(a.startDate));

    const education = await ctx.db
      .query("education")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    education.sort((a, b) => b.startYear.localeCompare(a.startYear));

    const skillRows = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const skills = await Promise.all(
      skillRows.map(async (s) => {
        let endorsedByMe = false;
        if (me !== null) {
          const endorsement = await ctx.db
            .query("skillEndorsements")
            .withIndex("by_skill_and_endorser", (q) =>
              q.eq("skillId", s._id).eq("endorserId", me._id),
            )
            .unique();
          endorsedByMe = endorsement !== null;
        }
        return { ...s, endorsedByMe };
      }),
    );
    skills.sort((a, b) => b.endorsements - a.endorsements);

    const recentPosts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .order("desc")
      .take(10);

    return { user, profile, experiences, education, skills, recentPosts };
  },
});

/**
 * Update the current user's profile. Only provided fields are changed. Creates
 * the profile row if it somehow doesn't exist yet.
 */
export const updateProfile = mutation({
  args: {
    headline: v.optional(v.string()),
    about: v.optional(v.string()),
    location: v.optional(v.string()),
    pronouns: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    targetRole: v.optional(v.string()),
    openToWork: v.optional(v.boolean()),
    coverImageUrl: v.optional(v.string()),
  },
  returns: profileDocValidator,
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const existing = await getProfileForUser(ctx, me._id);

    if (existing === null) {
      const profileId = await ctx.db.insert("profiles", {
        userId: me._id,
        headline: args.headline ?? "",
        about: args.about ?? "",
        location: args.location ?? "",
        pronouns: args.pronouns,
        websiteUrl: args.websiteUrl,
        githubUrl: args.githubUrl,
        twitterUrl: args.twitterUrl,
        targetRole: args.targetRole,
        openToWork: args.openToWork ?? false,
        coverImageUrl: args.coverImageUrl,
      });
      const created = await ctx.db.get(profileId);
      if (created === null) throw new Error("Failed to create profile");
      return created;
    }

    const patch: Partial<{
      headline: string;
      about: string;
      location: string;
      pronouns: string | undefined;
      websiteUrl: string | undefined;
      githubUrl: string | undefined;
      twitterUrl: string | undefined;
      targetRole: string;
      openToWork: boolean;
      coverImageUrl: string;
    }> = {};
    if (args.headline !== undefined) patch.headline = args.headline;
    if (args.about !== undefined) patch.about = args.about;
    if (args.location !== undefined) patch.location = args.location;
    // Optional-text fields: an empty string clears the field.
    if (args.pronouns !== undefined) {
      patch.pronouns = args.pronouns.trim() || undefined;
    }
    if (args.websiteUrl !== undefined) {
      patch.websiteUrl = args.websiteUrl.trim() || undefined;
    }
    if (args.githubUrl !== undefined) {
      patch.githubUrl = args.githubUrl.trim() || undefined;
    }
    if (args.twitterUrl !== undefined) {
      patch.twitterUrl = args.twitterUrl.trim() || undefined;
    }
    if (args.targetRole !== undefined) patch.targetRole = args.targetRole;
    if (args.openToWork !== undefined) patch.openToWork = args.openToWork;
    if (args.coverImageUrl !== undefined) {
      patch.coverImageUrl = args.coverImageUrl;
    }

    await ctx.db.patch(existing._id, patch);
    const updated = await ctx.db.get(existing._id);
    if (updated === null) throw new Error("Profile vanished during update");
    return updated;
  },
});

/**
 * Apply a saved AI profile draft to the live profile: copy headline + about
 * into the profile, add suggestedSkills as new skill rows (skipping ones the
 * user already has), and mark the draft "applied".
 */
export const applyProfileDraft = mutation({
  args: { draftId: v.id("profileDrafts") },
  returns: v.object({
    profileId: v.id("profiles"),
    skillsAdded: v.number(),
  }),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");

    const draft = await ctx.db.get(args.draftId);
    if (draft === null) throw new Error("Draft not found");
    if (draft.userId !== me._id) {
      throw new Error("Not authorized to apply this draft");
    }

    // Upsert the profile with the draft's headline/about + targetRole.
    let profile = await getProfileForUser(ctx, me._id);
    if (profile === null) {
      const profileId = await ctx.db.insert("profiles", {
        userId: me._id,
        headline: draft.headline,
        about: draft.about,
        location: "",
        targetRole: draft.targetRole,
        openToWork: false,
        coverImageUrl: undefined,
      });
      profile = await ctx.db.get(profileId);
      if (profile === null) throw new Error("Failed to create profile");
    } else {
      await ctx.db.patch(profile._id, {
        headline: draft.headline,
        about: draft.about,
        ...(draft.targetRole !== undefined
          ? { targetRole: draft.targetRole }
          : {}),
      });
    }

    // Add suggested skills that the user doesn't already have (case-insensitive).
    const existingSkills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    const have = new Set(existingSkills.map((s) => s.name.toLowerCase().trim()));

    let skillsAdded = 0;
    for (const name of draft.suggestedSkills) {
      const key = name.toLowerCase().trim();
      if (key.length === 0 || have.has(key)) continue;
      have.add(key);
      await ctx.db.insert("skills", {
        userId: me._id,
        name,
        endorsements: 0,
      });
      skillsAdded += 1;
    }

    await ctx.db.patch(draft._id, { status: "applied" });

    return { profileId: profile._id, skillsAdded };
  },
});

/** Update the current user's display name. */
export const updateAccountName = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const name = args.name.trim();
    if (name.length === 0) throw new Error("Name cannot be empty");
    await ctx.db.patch(me._id, { name });
    return null;
  },
});

const experienceFields = {
  title: v.string(),
  company: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  description: v.string(),
  location: v.optional(v.string()),
};

/** Add an experience entry to the current user's profile. */
export const addExperience = mutation({
  args: experienceFields,
  returns: v.id("experiences"),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    return await ctx.db.insert("experiences", {
      userId: me._id,
      title: args.title,
      company: args.company,
      startDate: args.startDate,
      endDate: args.endDate && args.endDate.length > 0 ? args.endDate : undefined,
      description: args.description,
      location: args.location && args.location.length > 0 ? args.location : undefined,
    });
  },
});

/** Replace all fields of one of the current user's experiences. */
export const updateExperience = mutation({
  args: { experienceId: v.id("experiences"), ...experienceFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const exp = await ctx.db.get(args.experienceId);
    if (exp === null || exp.userId !== me._id) {
      throw new Error("Not authorized to edit this experience");
    }
    await ctx.db.patch(args.experienceId, {
      title: args.title,
      company: args.company,
      startDate: args.startDate,
      endDate: args.endDate && args.endDate.length > 0 ? args.endDate : undefined,
      description: args.description,
      location: args.location && args.location.length > 0 ? args.location : undefined,
    });
    return null;
  },
});

/** Delete one of the current user's experiences. */
export const deleteExperience = mutation({
  args: { experienceId: v.id("experiences") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const exp = await ctx.db.get(args.experienceId);
    if (exp === null || exp.userId !== me._id) {
      throw new Error("Not authorized to delete this experience");
    }
    await ctx.db.delete(args.experienceId);
    return null;
  },
});

/** Add a skill (case-insensitive dedupe). Returns null if it already exists. */
export const addSkill = mutation({
  args: { name: v.string() },
  returns: v.union(v.id("skills"), v.null()),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const name = args.name.trim();
    if (name.length === 0) return null;
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    if (existing.some((s) => s.name.toLowerCase().trim() === name.toLowerCase())) {
      return null;
    }
    return await ctx.db.insert("skills", { userId: me._id, name, endorsements: 0 });
  },
});

/** Remove one of the current user's skills (and its endorsement rows). */
export const removeSkill = mutation({
  args: { skillId: v.id("skills") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const skill = await ctx.db.get(args.skillId);
    if (skill === null || skill.userId !== me._id) {
      throw new Error("Not authorized to remove this skill");
    }
    const endorsements = await ctx.db
      .query("skillEndorsements")
      .withIndex("by_skill_and_endorser", (q) => q.eq("skillId", skill._id))
      .collect();
    for (const e of endorsements) await ctx.db.delete(e._id);
    await ctx.db.delete(args.skillId);
    return null;
  },
});

/**
 * Endorse / un-endorse someone else's skill. Keeps the denormalized
 * `endorsements` count in sync and notifies the skill's owner.
 */
export const toggleEndorsement = mutation({
  args: { skillId: v.id("skills") },
  returns: v.object({ endorsed: v.boolean(), endorsements: v.number() }),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const skill = await ctx.db.get(args.skillId);
    if (skill === null) throw new Error("Skill not found");
    if (skill.userId === me._id) {
      throw new Error("You can't endorse your own skill");
    }

    const existing = await ctx.db
      .query("skillEndorsements")
      .withIndex("by_skill_and_endorser", (q) =>
        q.eq("skillId", skill._id).eq("endorserId", me._id),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.delete(existing._id);
      const endorsements = Math.max(0, skill.endorsements - 1);
      await ctx.db.patch(skill._id, { endorsements });
      return { endorsed: false, endorsements };
    }

    await ctx.db.insert("skillEndorsements", {
      skillId: skill._id,
      endorserId: me._id,
    });
    const endorsements = skill.endorsements + 1;
    await ctx.db.patch(skill._id, { endorsements });
    await notify(ctx, {
      userId: skill.userId,
      actorId: me._id,
      type: "endorsement",
      message: `${me.name} endorsed you for ${skill.name}`,
    });
    return { endorsed: true, endorsements };
  },
});

// ── Education CRUD ───────────────────────────────────────────────────

const educationFields = {
  school: v.string(),
  degree: v.string(),
  field: v.string(),
  startYear: v.string(),
  endYear: v.optional(v.string()),
  description: v.optional(v.string()),
};

/** Add an education entry to the current user's profile. */
export const addEducation = mutation({
  args: educationFields,
  returns: v.id("education"),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    if (args.school.trim().length === 0) {
      throw new Error("School is required");
    }
    return await ctx.db.insert("education", {
      userId: me._id,
      school: args.school.trim(),
      degree: args.degree.trim(),
      field: args.field.trim(),
      startYear: args.startYear,
      endYear: args.endYear && args.endYear.length > 0 ? args.endYear : undefined,
      description:
        args.description && args.description.trim().length > 0
          ? args.description.trim()
          : undefined,
    });
  },
});

/** Replace all fields of one of the current user's education entries. */
export const updateEducation = mutation({
  args: { educationId: v.id("education"), ...educationFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const edu = await ctx.db.get(args.educationId);
    if (edu === null || edu.userId !== me._id) {
      throw new Error("Not authorized to edit this education entry");
    }
    if (args.school.trim().length === 0) {
      throw new Error("School is required");
    }
    await ctx.db.patch(args.educationId, {
      school: args.school.trim(),
      degree: args.degree.trim(),
      field: args.field.trim(),
      startYear: args.startYear,
      endYear: args.endYear && args.endYear.length > 0 ? args.endYear : undefined,
      description:
        args.description && args.description.trim().length > 0
          ? args.description.trim()
          : undefined,
    });
    return null;
  },
});

/** Delete one of the current user's education entries. */
export const deleteEducation = mutation({
  args: { educationId: v.id("education") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await getUserByIdentity(ctx);
    if (me === null) throw new Error("Not authenticated");
    const edu = await ctx.db.get(args.educationId);
    if (edu === null || edu.userId !== me._id) {
      throw new Error("Not authorized to delete this education entry");
    }
    await ctx.db.delete(args.educationId);
    return null;
  },
});
