"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Building2, MapPin, Users, Search, Rocket } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const companies = useQuery(api.companies.getCompanies, {
    search: search || undefined,
  });
  const myCompany = useQuery(api.companies.getMyCompany, {});

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Companies
        </h1>
        {myCompany === null && (
          <Button
            render={<Link href="/onboarding/company" />}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Rocket className="h-4 w-4" />
            Create a company page
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, industry, or location…"
          className="max-w-sm rounded-full pl-9"
        />
      </div>

      {companies === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? "No companies match" : "No companies yet"}
          description={
            search ? "Try a different search." : "Be the first to create one."
          }
        />
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
                  <p className="truncate font-heading text-lg font-semibold tracking-tight">
                    {c.name}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {c.industry}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
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
                <Badge
                  variant="secondary"
                  className="mt-3 border-transparent bg-apricot/30 font-mono text-[11px] text-ink"
                >
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
