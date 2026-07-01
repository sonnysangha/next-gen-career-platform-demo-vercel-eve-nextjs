"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Building2, MapPin, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function CompaniesPage() {
  const companies = useQuery(api.companies.getCompanies, {});

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">Companies</h1>

      {companies === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies yet" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {companies.map((c) => (
            <Link
              key={c._id}
              href={`/companies/${c.slug}`}
              className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <CompanyLogo name={c.name} src={c.logoUrl} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.industry}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {c.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {c.size}
                    </span>
                  </p>
                </div>
              </div>
              {c.openRoles > 0 && (
                <Badge variant="secondary" className="mt-3">
                  {c.openRoles} open role{c.openRoles === 1 ? "" : "s"}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
