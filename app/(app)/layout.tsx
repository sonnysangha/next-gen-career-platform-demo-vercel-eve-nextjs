import { TopNav } from "@/components/layout/top-nav";
import { EnsureUser } from "@/components/layout/ensure-user";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <TopNav />
      <EnsureUser />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
