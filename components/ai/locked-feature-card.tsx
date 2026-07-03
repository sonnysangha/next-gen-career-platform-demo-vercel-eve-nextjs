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
    <div className={cn("rounded-2xl bg-ink p-5 text-paper", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-apricot/20 text-apricot">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-heading text-[17px] font-medium tracking-tight">
            {title}
            <Sparkles className="h-3.5 w-3.5 text-apricot" />
          </p>
          <p className="mt-0.5 text-sm text-paper/70">{description}</p>
          <Button
            render={<Link href="/pricing" />}
            size="sm"
            className="mt-3 gap-1.5 bg-apricot text-ink hover:bg-apricot/90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
