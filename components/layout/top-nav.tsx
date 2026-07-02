"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Briefcase,
  Building2,
  MessagesSquare,
  Sparkles,
  Search,
  LayoutDashboard,
} from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/logo";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/feed", label: "Home", icon: Home, exact: true },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/outreach", label: "Outreach", icon: MessagesSquare },
  { href: "/agent", label: "AI Agent", icon: Sparkles },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const myCompany = useQuery(api.companies.getMyCompany, {});

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navItems = myCompany
    ? [
        ...NAV_ITEMS,
        { href: "/company", label: "Dashboard", icon: LayoutDashboard },
      ]
    : NAV_ITEMS;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-4">
        <Logo href="/feed" showWordmark={false} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/jobs?q=${encodeURIComponent(query)}`);
          }}
          className="relative hidden max-w-xs flex-1 sm:block"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs, people, companies"
            className="h-9 bg-muted/50 pl-8"
          />
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
                  "flex min-w-14 flex-col items-center rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
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
            <UserButton
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
