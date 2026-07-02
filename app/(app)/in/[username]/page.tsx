"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  MapPin,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  Wand2,
  Check,
  UserRound,
  UserPlus,
  UserMinus,
  Globe,
  Code2,
  AtSign,
  ThumbsUp,
  Newspaper,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { AiActionButton } from "@/components/ai/ai-action-button";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { ExperienceDialog } from "@/components/profile/experience-dialog";
import { EducationDialog } from "@/components/profile/education-dialog";
import { SkillsEditor } from "@/components/profile/skills-editor";
import { ImagePickerButton } from "@/components/image-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_FEATURES } from "@/lib/ai-features";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

function Card({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { has } = useAuth();
  const data = useQuery(api.profiles.getProfileByUsername, { username });
  const me = useQuery(api.users.getCurrentUser);
  const drafts = useQuery(api.drafts.getMyProfileDrafts, {});
  const followStats = useQuery(
    api.network.getFollowStats,
    data ? { userId: data.user._id } : "skip",
  );
  const applyDraft = useMutation(api.profiles.applyProfileDraft);
  const deleteProfileDraft = useMutation(api.drafts.deleteProfileDraft);
  const becomeAlex = useMutation(api.demo.becomeAlex);
  const toggleFollow = useMutation(api.network.toggleFollow);
  const toggleEndorsement = useMutation(api.profiles.toggleEndorsement);
  const setAvatar = useMutation(api.files.setMyAvatar);
  const setCover = useMutation(api.files.setMyProfileCover);

  const optimizerLocked = !(has?.({ feature: AI_FEATURES.profile_optimizer }) ?? false);

  if (data === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }
  if (data === null) {
    return (
      <EmptyState
        icon={UserRound}
        title="Profile not found"
        description="This person doesn't exist or hasn't set up their profile yet."
      />
    );
  }

  const { user, profile, experiences, education, skills, recentPosts } = data;
  const isOwn = me?.user._id === user._id;
  const signedIn = me !== undefined && me !== null;
  const savedDrafts = (drafts ?? []).filter((d) => d.status === "saved");

  const socialLinks = [
    profile?.websiteUrl
      ? { href: profile.websiteUrl, icon: Globe, label: "Website" }
      : null,
    profile?.githubUrl
      ? { href: profile.githubUrl, icon: Code2, label: "GitHub" }
      : null,
    profile?.twitterUrl
      ? { href: profile.twitterUrl, icon: AtSign, label: "X" }
      : null,
  ].filter(Boolean) as { href: string; icon: typeof Globe; label: string }[];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div
          className="relative h-32 bg-gradient-to-r from-primary/40 to-primary/10 bg-cover bg-center sm:h-40"
          style={
            profile?.coverImageUrl
              ? { backgroundImage: `url(${profile.coverImageUrl})` }
              : undefined
          }
        >
          {isOwn && (
            <div className="absolute bottom-2 right-2">
              <ImagePickerButton
                label={profile?.coverImageUrl ? "Change cover" : "Add cover"}
                hasImage={!!profile?.coverImageUrl}
                onUploaded={async (storageId) => {
                  await setCover({ storageId });
                  toast.success("Cover updated");
                }}
                onClear={async () => {
                  await setCover({ storageId: undefined });
                  toast.success("Cover removed");
                }}
                variant="secondary"
                size="xs"
              />
            </div>
          )}
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <div className="flex items-end gap-2">
              <UserAvatar
                name={user.name}
                src={user.imageUrl}
                className="h-20 w-20 border-4 border-card"
              />
              {isOwn && (
                <ImagePickerButton
                  label="Photo"
                  hasImage={!!user.imageStorageId}
                  onUploaded={async (storageId) => {
                    await setAvatar({ storageId });
                    toast.success("Profile photo updated");
                  }}
                  onClear={async () => {
                    await setAvatar({ storageId: undefined });
                    toast.success("Custom photo removed");
                  }}
                  size="xs"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOwn ? (
                <EditProfileDialog user={user} profile={profile} />
              ) : (
                signedIn && (
                  <Button
                    size="sm"
                    variant={followStats?.followedByMe ? "outline" : "default"}
                    className="gap-1.5"
                    onClick={async () => {
                      try {
                        const { following } = await toggleFollow({
                          userId: user._id,
                        });
                        toast.success(
                          following
                            ? `Following ${user.name}`
                            : `Unfollowed ${user.name}`,
                        );
                      } catch {
                        toast.error("Could not update follow");
                      }
                    }}
                  >
                    {followStats?.followedByMe ? (
                      <UserMinus className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {followStats?.followedByMe ? "Following" : "Follow"}
                  </Button>
                )
              )}
            </div>
          </div>
          <div className="mt-3">
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              {user.name}
              {profile?.pronouns && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({profile.pronouns})
                </span>
              )}
              {profile?.openToWork && (
                <BadgeCheck className="h-5 w-5 text-primary" />
              )}
            </h1>
            <p className="text-muted-foreground">
              {profile?.headline || "No headline yet"}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {profile?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
              )}
              {followStats && (
                <span>
                  <span className="font-medium text-foreground">
                    {followStats.followers}
                  </span>{" "}
                  followers ·{" "}
                  <span className="font-medium text-foreground">
                    {followStats.following}
                  </span>{" "}
                  following
                </span>
              )}
              {profile?.openToWork && (
                <Badge variant="secondary" className="gap-1">
                  Open to work
                </Badge>
              )}
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {socialLinks.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo helper */}
      {isOwn && (
        <div className="flex items-center justify-between rounded-xl border border-dashed bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">
            Demo: load the Alex Carter storyline onto your account.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              await becomeAlex({});
              toast.success("Loaded the Alex Carter demo profile");
            }}
          >
            <Wand2 className="h-4 w-4" />
            Become Alex Carter
          </Button>
        </div>
      )}

      {/* Improve with AI */}
      {isOwn && (
        <AiActionButton
          locked={optimizerLocked}
          label="Improve with AI"
          prompt="Improve my profile for Next.js AI Engineer roles — rewrite my headline, about, and experience bullets."
          lockedTitle="AI Profile Optimizer"
          lockedDescription="Let the AI Career Agent rewrite your headline, about, and experience for your target role."
        />
      )}

      {/* Saved AI drafts */}
      {isOwn && savedDrafts.length > 0 && (
        <Card title="AI profile drafts" icon={Wand2}>
          <div className="space-y-3">
            {savedDrafts.map((d) => (
              <div key={d._id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Suggested headline</p>
                <p className="font-medium">{d.headline}</p>
                <p className="mt-2 text-xs text-muted-foreground">Suggested about</p>
                <p className="text-sm">{d.about}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={async () => {
                      await applyDraft({ draftId: d._id as Id<"profileDrafts"> });
                      toast.success("Applied to your live profile");
                    }}
                  >
                    <Check className="h-4 w-4" />
                    Apply to profile
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await deleteProfileDraft({
                        draftId: d._id as Id<"profileDrafts">,
                      });
                      toast.success("Draft deleted");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* About */}
      <Card title="About" icon={UserRound}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {profile?.about || "Nothing here yet."}
        </p>
      </Card>

      {/* Experience */}
      <Card
        title="Experience"
        icon={Briefcase}
        action={isOwn ? <ExperienceDialog /> : undefined}
      >
        {experiences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No experience listed.</p>
        ) : (
          <div className="space-y-4">
            {experiences.map((exp) => (
              <div key={exp._id} className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{exp.title}</p>
                  {exp.companySlug ? (
                    <Link
                      href={`/companies/${exp.companySlug}`}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {exp.company}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {exp.startDate} – {exp.endDate ?? "Present"}
                    {exp.location ? ` · ${exp.location}` : ""}
                  </p>
                  {exp.description && (
                    <p className="mt-1 text-sm">{exp.description}</p>
                  )}
                </div>
                {isOwn && <ExperienceDialog experience={exp} />}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Education */}
      <Card
        title="Education"
        icon={GraduationCap}
        action={isOwn ? <EducationDialog /> : undefined}
      >
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground">No education listed.</p>
        ) : (
          <div className="space-y-4">
            {education.map((edu) => (
              <div key={edu._id} className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{edu.school}</p>
                  <p className="text-sm text-muted-foreground">
                    {[edu.degree, edu.field].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {edu.startYear} – {edu.endYear ?? "Present"}
                  </p>
                  {edu.description && (
                    <p className="mt-1 text-sm">{edu.description}</p>
                  )}
                </div>
                {isOwn && <EducationDialog education={edu} />}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Skills */}
      <Card title="Skills" icon={ThumbsUp}>
        {isOwn ? (
          <SkillsEditor skills={skills} />
        ) : skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills listed.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <button
                key={s._id}
                type="button"
                disabled={!signedIn}
                onClick={async () => {
                  try {
                    const { endorsed } = await toggleEndorsement({
                      skillId: s._id,
                    });
                    toast.success(
                      endorsed
                        ? `Endorsed ${s.name}`
                        : `Endorsement removed`,
                    );
                  } catch {
                    toast.error("Could not endorse");
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  s.endorsedByMe
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "bg-secondary text-secondary-foreground hover:border-primary/40",
                  signedIn && "cursor-pointer",
                )}
                title={signedIn ? "Endorse this skill" : undefined}
              >
                {s.name}
                <span
                  className={cn(
                    "flex items-center gap-0.5",
                    s.endorsedByMe ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <ThumbsUp
                    className={cn("h-3 w-3", s.endorsedByMe && "fill-current")}
                  />
                  {s.endorsements}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Activity */}
      <Card title="Activity" icon={Newspaper}>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent posts.</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((p) => (
              <div key={p._id} className="rounded-lg border p-3 text-sm">
                <p className="whitespace-pre-wrap">{p.content}</p>
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    className="mt-2 max-h-64 w-full rounded-md border object-cover"
                  />
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {timeAgo(p._creationTime)} · {p.likeCount} likes
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
