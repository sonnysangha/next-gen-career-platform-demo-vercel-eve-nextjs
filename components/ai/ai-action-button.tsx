import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LockedFeatureCard } from "./locked-feature-card";

/**
 * A Pro AI trigger. When unlocked, deep-links into the AI Career Agent with a
 * prefilled prompt (the agent auto-runs it). When locked, renders the upsell.
 * Entitlement is decided server-side by the caller (`locked` prop).
 */
export function AiActionButton({
  locked,
  label,
  prompt,
  lockedTitle,
  lockedDescription,
  size = "sm",
  variant = "default",
}: {
  locked: boolean;
  label: string;
  prompt: string;
  lockedTitle: string;
  lockedDescription: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
}) {
  if (locked) {
    return (
      <LockedFeatureCard title={lockedTitle} description={lockedDescription} />
    );
  }
  return (
    <Button
      render={<Link href={`/agent?prompt=${encodeURIComponent(prompt)}`} />}
      size={size}
      variant={variant}
      className="gap-1.5"
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </Button>
  );
}
