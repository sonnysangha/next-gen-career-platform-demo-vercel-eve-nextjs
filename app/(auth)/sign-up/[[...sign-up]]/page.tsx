import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { localRedirectPath } from "@/lib/safe-redirect";

/**
 * Sign-up with an account-type chooser:
 * - Job seeker → default flow, lands on the feed.
 * - Company   → lands on /onboarding/company, which creates a Clerk
 *   Organization and the linked company page.
 * Already-signed-in visitors are bounced to their destination directly.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; redirect_url?: string }>;
}) {
  const [{ userId }, { type, redirect_url }] = await Promise.all([
    auth(),
    searchParams,
  ]);
  const isCompany = type === "company";
  if (userId) {
    redirect(
      isCompany
        ? "/onboarding/company"
        : (localRedirectPath(redirect_url) ?? "/feed"),
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      <div className="grid w-full grid-cols-2 gap-2 rounded-xl border bg-card p-1.5">
        <Link
          href="/sign-up"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            !isCompany
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Briefcase className="h-4 w-4" />
          I&apos;m looking for work
        </Link>
        <Link
          href="/sign-up?type=company"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isCompany
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Building2 className="h-4 w-4" />
          We&apos;re hiring
        </Link>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {isCompany
          ? "Create a company account — you'll set up your organization, company page, and job posts next."
          : "Create a free account to build your profile, follow people, and apply to jobs."}
      </p>

      <SignUp
        key={isCompany ? "company" : "person"}
        forceRedirectUrl={isCompany ? "/onboarding/company" : undefined}
        unsafeMetadata={isCompany ? { accountType: "company" } : undefined}
      />
    </div>
  );
}
