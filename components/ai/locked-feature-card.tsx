import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown to Free users where a Pro AI feature would be. Server-safe (presentational).
 */
export function LockedFeatureCard({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed bg-gradient-to-br from-primary/5 to-transparent p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-heading text-[17px] font-medium">
            {title}
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          <Button
            render={<Link href="/pricing" />}
            size="sm"
            className="mt-3 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
