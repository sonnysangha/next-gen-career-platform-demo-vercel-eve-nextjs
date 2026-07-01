"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Sparkles,
  Briefcase,
  Newspaper,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/user-avatar";
import { PostComposer } from "@/components/feed/post-composer";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatSalary } from "@/lib/format";

export default function FeedPage() {
  const me = useQuery(api.users.getCurrentUser);
  const feed = useQuery(api.feed.getFeed, { limit: 30 });
  const jobs = useQuery(api.jobs.getJobs, {});

  const suggestedJobs = jobs?.slice(0, 3) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      {/* Left: profile card */}
      <aside className="hidden lg:block">
        <div className="sticky top-[4.5rem] space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="h-14 bg-gradient-to-r from-primary/30 to-primary/10" />
            <div className="-mt-7 flex flex-col items-center px-4 pb-4 text-center">
              {me === undefined ? (
                <Skeleton className="h-14 w-14 rounded-full" />
              ) : (
                <UserAvatar
                  name={me?.user.name ?? "You"}
                  src={me?.user.imageUrl}
                  className="h-14 w-14 border-4 border-card"
                />
              )}
              <p className="mt-2 font-medium">{me?.user.name ?? " "}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {me?.profile?.headline ?? "Add a headline to your profile"}
              </p>
              {me?.user.username && (
                <Button
                  render={<Link href={`/in/${me.user.username}`} />}
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                >
                  View profile
                </Button>
              )}
            </div>
          </div>

          <Link
            href="/agent"
            className="flex items-center gap-2 rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-3 text-sm font-medium hover:border-primary/40"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            AI Career Agent
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </aside>

      {/* Center: composer + feed */}
      <div className="space-y-4">
        <PostComposer currentUser={me ? me.user : null} />

        {feed === undefined ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="mt-3 h-16 w-full" />
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Your feed is quiet"
            description="Follow people or share the first update to get things going."
          />
        ) : (
          <div className="space-y-4">
            {feed.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Right: suggested jobs */}
      <aside className="hidden lg:block">
        <div className="sticky top-[4.5rem] space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Suggested jobs</p>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          {jobs === undefined ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            suggestedJobs.map((job) => (
              <Link
                key={job._id}
                href={`/jobs?job=${job._id}`}
                className="block rounded-lg border p-2.5 text-sm hover:border-primary/40"
              >
                <p className="truncate font-medium">{job.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {job.company?.name}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {job.location} ·{" "}
                  {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                </p>
              </Link>
            ))
          )}
          <Button
            render={<Link href="/jobs" />}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            See all jobs
          </Button>
        </div>
      </aside>
    </div>
  );
}
