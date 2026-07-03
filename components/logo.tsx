import Link from "next/link";
import { Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showWordmark = true,
  wordmarkClassName,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Waypoints className="h-5 w-5" />
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-heading text-xl font-semibold tracking-tight",
            wordmarkClassName
          )}
        >
          Career<span className="italic text-primary">Connect</span>
        </span>
      )}
    </Link>
  );
}
