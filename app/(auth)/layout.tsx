import { Logo } from "@/components/logo";
import { Sparkles, Briefcase, Users } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand / value-prop panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Logo className="text-primary-foreground [&_span]:text-primary-foreground" />
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight">
            Grow your career with an AI Career Agent.
          </h1>
          <ul className="space-y-4 text-primary-foreground/90">
            <li className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0" />
              Optimize your profile and get matched to the right roles.
            </li>
            <li className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 shrink-0" />
              Discover jobs, save favorites, and draft recruiter outreach.
            </li>
            <li className="flex items-center gap-3">
              <Users className="h-5 w-5 shrink-0" />
              Connect with professionals and companies hiring now.
            </li>
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} CareerConnect
        </p>
      </div>

      {/* Auth form */}
      <div className="flex flex-col items-center justify-center gap-6 p-6 md:p-10">
        <Logo className="lg:hidden" />
        {children}
      </div>
    </div>
  );
}
