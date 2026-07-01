"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { X, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SkillsEditor({
  skills,
}: {
  skills: { _id: Id<"skills">; name: string }[];
}) {
  const addSkill = useMutation(api.profiles.addSkill);
  const removeSkill = useMutation(api.profiles.removeSkill);
  const [value, setValue] = useState("");

  async function add() {
    const name = value.trim();
    if (!name) return;
    setValue("");
    await addSkill({ name });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {skills.length === 0 && (
          <p className="text-sm text-muted-foreground">No skills yet.</p>
        )}
        {skills.map((s) => (
          <Badge key={s._id} variant="secondary" className="gap-1 pr-1 font-normal">
            {s.name}
            <button
              type="button"
              onClick={() => removeSkill({ skillId: s._id })}
              className="rounded-full p-0.5 hover:bg-background hover:text-destructive"
              aria-label={`Remove ${s.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a skill…"
          className="h-9 max-w-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={add}
          disabled={!value.trim()}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
