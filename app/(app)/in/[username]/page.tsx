"use client";

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
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { AiActionButton } from "@/components/ai/ai-action-button";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { ExperienceDialog } from "@/components/profile/experience-dialog";
import { SkillsEditor } from "@/components/profile/skills-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_FEATURES } from "@/lib/ai-features";
import { timeAgo } from "@/lib/format";

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
  const applyDraft = useMutation(api.profiles.applyProfileDraft);
  const becomeAlex = useMutation(api.demo.becomeAlex);

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

  const { user, profile, experiences, skills, recentPosts } = data;
  const isOwn = me?.user._id === user._id;
  const savedDrafts = (drafts ?? []).filter((d) => d.status === "saved");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div
          className="h-28 bg-gradient-to-r from-primary/40 to-primary/10"
          style={
            profile?.coverImageUrl
              ? { backgroundImage: `url(${profile.coverImageUrl})`, backgroundSize: "cover" }
              : undefined
          }
        />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <UserAvatar
              name={user.name}
              src={user.imageUrl}
              className="h-20 w-20 border-4 border-card"
            />
            {isOwn && <EditProfileDialog user={user} profile={profile} />}
          </div>
          <div className="mt-3">
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              {user.name}
              {profile?.openToWork && (
                <BadgeCheck className="h-5 w-5 text-primary" />
              )}
            </h1>
            <p className="text-muted-foreground">
              {profile?.headline ?? "No headline yet"}
            </p>
            <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {profile?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
              )}
              {profile?.openToWork && (
                <Badge variant="secondary" className="gap-1">
                  Open to work
                </Badge>
              )}
            </p>
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
                <Button
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={async () => {
                    await applyDraft({ draftId: d._id as Id<"profileDrafts"> });
                    toast.success("Applied to your live profile");
                  }}
                >
                  <Check className="h-4 w-4" />
                  Apply to profile
                </Button>
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
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.startDate} – {exp.endDate ?? "Present"}
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

      {/* Skills */}
      <Card title="Skills" icon={GraduationCap}>
        {isOwn ? (
          <SkillsEditor skills={skills} />
        ) : skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills listed.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Badge key={s._id} variant="secondary" className="font-normal">
                {s.name}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Activity */}
      <Card title="Activity" icon={Briefcase}>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent posts.</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((p) => (
              <div key={p._id} className="rounded-lg border p-3 text-sm">
                <p className="whitespace-pre-wrap">{p.content}</p>
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
