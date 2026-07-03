"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import {
  Home,
  Briefcase,
  Building2,
  MessagesSquare,
  Sparkles,
  Search,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/logo";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { CompanyLogo } from "@/components/company-logo";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/feed", label: "Home", icon: Home, exact: true },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/outreach", label: "Outreach", icon: MessagesSquare },
  { href: "/agent", label: "AI Agent", icon: Sparkles },
];

function SearchGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <p className="px-2 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function SearchRow({
  href,
  title,
  subtitle,
  leading,
}: {
  href: string;
  title: string;
  subtitle: string;
  leading: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted"
    >
      {leading}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const myCompany = useQuery(api.companies.getMyCompany, {});
  const me = useQuery(api.users.getCurrentUser, {});
  const myUsername = me?.user.username;

  // Typeahead across companies, people, and jobs. Deferred so fast typing
  // doesn't fire a query per keystroke.
  const deferredQuery = useDeferredValue(query.trim());
  const results = useQuery(
    api.search.global,
    searchFocused && deferredQuery.length >= 2 ? { q: deferredQuery } : "skip",
  );
  const showDropdown =
    searchFocused &&
    deferredQuery.length >= 2 &&
    results !== undefined &&
    (results.companies.length > 0 ||
      results.people.length > 0 ||
      results.jobs.length > 0);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Company accounts get their dashboard; everyone else goes straight into
  // the B2B flow (/onboarding/company creates the Clerk org + linked company,
  // and redirects to /company when one already exists).
  const navItems =
    myCompany === undefined
      ? NAV_ITEMS
      : myCompany
        ? [
            ...NAV_ITEMS,
            { href: "/company", label: "Dashboard", icon: LayoutDashboard },
          ]
        : [
            ...NAV_ITEMS,
            {
              href: "/onboarding/company",
              label: "For companies",
              icon: LayoutDashboard,
            },
          ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-4">
        <Logo href="/feed" wordmarkClassName="hidden xl:inline" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchFocused(false);
            router.push(`/jobs?q=${encodeURIComponent(query)}`);
          }}
          className="relative hidden max-w-xs flex-1 sm:block"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            // Delay so clicks on dropdown links land before it unmounts.
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search jobs, people, companies"
            className="h-9 rounded-full bg-muted/60 pl-9"
          />

          {showDropdown && (
            <div className="absolute left-0 right-0 top-11 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border bg-popover p-2 shadow-lg">
              {results.companies.length > 0 && (
                <SearchGroup label="Companies">
                  {results.companies.map((c) => (
                    <SearchRow
                      key={c._id}
                      href={`/companies/${c.slug}`}
                      title={c.name}
                      subtitle={c.industry}
                      leading={
                        <CompanyLogo
                          name={c.name}
                          src={c.logoUrl}
                          className="h-7 w-7"
                        />
                      }
                    />
                  ))}
                </SearchGroup>
              )}
              {results.people.length > 0 && (
                <SearchGroup label="People">
                  {results.people.map((p) => (
                    <SearchRow
                      key={p._id}
                      href={`/in/${p.username}`}
                      title={p.name}
                      subtitle={p.headline ?? `@${p.username}`}
                      leading={
                        <UserAvatar
                          name={p.name}
                          src={p.imageUrl}
                          className="h-7 w-7"
                        />
                      }
                    />
                  ))}
                </SearchGroup>
              )}
              {results.jobs.length > 0 && (
                <SearchGroup label="Jobs">
                  {results.jobs.map((j) => (
                    <SearchRow
                      key={j._id}
                      href={`/jobs?job=${j._id}`}
                      title={j.title}
                      subtitle={[j.companyName, j.location]
                        .filter(Boolean)
                        .join(" · ")}
                      leading={
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                      }
                    />
                  ))}
                </SearchGroup>
              )}
            </div>
          )}
        </form>

        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-w-14 flex-col items-center rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "text-foreground after:absolute after:-bottom-2 after:h-[3px] after:w-7 after:rounded-full after:bg-apricot"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          <NotificationsBell />

          {/* Org switcher: create/switch orgs, invite teammates. Only shown
              for company accounts so job seekers keep a clean nav. */}
          {myCompany?.orgId && (
            <div className="hidden sm:block">
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/onboarding/company"
                afterSelectOrganizationUrl="/company"
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: "h-9 px-2",
                  },
                }}
              />
            </div>
          )}

          <div className="ml-1 sm:ml-2">
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }}>
              {myUsername && (
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="View profile"
                    labelIcon={<UserRound className="h-4 w-4" />}
                    href={`/in/${myUsername}`}
                  />
                  <UserButton.Action label="manageAccount" />
                  <UserButton.Action label="signOut" />
                </UserButton.MenuItems>
              )}
            </UserButton>
          </div>
        </nav>
      </div>
    </header>
  );
}
