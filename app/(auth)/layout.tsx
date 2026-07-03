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
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-sky/25 blur-3xl"
        />
        <Logo className="relative text-paper [&_span]:text-paper" />
        <div className="relative space-y-6">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-apricot">
            Powered by Vercel Eve
          </p>
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight">
            Grow your career with an AI Career Agent.
          </h1>
          <ul className="space-y-4 text-paper/85">
            <li className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-apricot" />
              Optimize your profile and get matched to the right roles.
            </li>
            <li className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 shrink-0 text-apricot" />
              Discover jobs, save favorites, and draft recruiter outreach.
            </li>
            <li className="flex items-center gap-3">
              <Users className="h-5 w-5 shrink-0 text-apricot" />
              Connect with professionals and companies hiring now.
            </li>
          </ul>
        </div>
        <p className="relative font-mono text-xs text-paper/60">
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
