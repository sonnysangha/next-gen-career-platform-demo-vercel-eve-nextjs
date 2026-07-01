"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Lazily creates the Convex `users` + `profiles` rows for the signed-in Clerk user
 * on first authenticated load. Renders nothing.
 */
export function EnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const upsert = useMutation(api.users.upsertCurrentUser);
  const done = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !done.current) {
      done.current = true;
      upsert().catch(() => {
        // allow a retry on transient failure
        done.current = false;
      });
    }
  }, [isAuthenticated, upsert]);

  return null;
}
