"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  UserPlus,
  Award,
  Briefcase,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  endorsement: Award,
  application: Briefcase,
  application_status: Briefcase,
};

function hrefFor(n: {
  type: string;
  postId?: string;
  jobId?: string;
  actor: { username: string } | null;
}): string {
  if (n.type === "application") return "/company";
  if (n.type === "application_status") return "/applications";
  if (n.postId) return "/feed";
  if (n.actor) return `/in/${n.actor.username}`;
  return "/feed";
}

export function NotificationsBell() {
  const notifications = useQuery(api.notifications.getMyNotifications, {});
  const unread = useQuery(api.notifications.getUnreadCount, {});
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const remove = useMutation(api.notifications.deleteNotification);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="h-5 w-5" />
        {typeof unread === "number" && unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="font-heading text-sm font-semibold tracking-tight">
            Notifications
          </p>
          {typeof unread === "number" && unread > 0 && (
            <Button
              variant="ghost"
              size="xs"
              className="gap-1"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications === undefined ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center font-heading text-sm italic text-muted-foreground">
              You&apos;re all caught up 🎉
            </p>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                return (
                  <div
                    key={n._id}
                    className={cn(
                      "group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    {n.actor ? (
                      <UserAvatar
                        name={n.actor.name}
                        src={n.actor.imageUrl}
                        className="h-8 w-8"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Link
                      href={hrefFor(n)}
                      onClick={() => {
                        if (!n.read) void markRead({ notificationId: n._id });
                      }}
                      className="min-w-0 flex-1"
                    >
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void remove({ notificationId: n._id })}
                      className="mt-0.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
