"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Building2,
  Briefcase,
  ExternalLink,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { ImagePickerButton } from "@/components/image-input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CompanyEditDialog } from "@/components/company/company-edit-dialog";
import { CompanyBillingCard } from "@/components/company/billing-card";
import { JobDialog } from "@/components/company/job-dialog";
import { JobPostList } from "@/components/company/job-post-list";
import { ApplicantsPanel } from "@/components/company/applicants-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CompanyDashboardPage() {
  const router = useRouter();
  const company = useQuery(api.companies.getMyCompany, {});
  const jobs = useQuery(
    api.jobs.getCompanyJobs,
    company ? { companyId: company._id } : "skip",
  );
  const setLogo = useMutation(api.files.setCompanyLogo);
  const setCover = useMutation(api.files.setCompanyCover);
  const deleteCompany = useMutation(api.companies.deleteCompany);

  if (company === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (company === null) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={Building2}
          title="No company yet"
          description="Set up your organization and company page to start posting jobs and reviewing applicants."
        />
        <div className="mt-4 flex justify-center">
          <Button render={<Link href="/onboarding/company" />} className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Create your company
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div
          className="relative h-32 bg-gradient-to-r from-primary/40 to-primary/10 bg-cover bg-center"
          style={
            company.coverImageUrl
              ? { backgroundImage: `url(${company.coverImageUrl})` }
              : undefined
          }
        >
          <div className="absolute bottom-2 right-2">
            <ImagePickerButton
              label={company.coverImageUrl ? "Change cover" : "Add cover"}
              hasImage={!!company.coverImageUrl}
              onUploaded={async (storageId) => {
                await setCover({ companyId: company._id, storageId });
                toast.success("Cover updated");
              }}
              onClear={async () => {
                await setCover({ companyId: company._id, storageId: undefined });
                toast.success("Cover removed");
              }}
              variant="secondary"
              size="xs"
            />
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-8 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <CompanyLogo
                name={company.name}
                src={company.logoUrl}
                className="h-16 w-16 rounded-xl border-4 border-card bg-card"
              />
              <ImagePickerButton
                label={company.logoUrl ? "Change logo" : "Add logo"}
                hasImage={!!company.logoUrl}
                onUploaded={async (storageId) => {
                  await setLogo({ companyId: company._id, storageId });
                  toast.success("Logo updated");
                }}
                onClear={async () => {
                  await setLogo({ companyId: company._id, storageId: undefined });
                  toast.success("Logo removed");
                }}
                size="xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                render={<Link href={`/companies/${company.slug}`} />}
                variant="ghost"
                size="sm"
                className="gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                Public page
              </Button>
              <CompanyEditDialog company={company} />
            </div>
          </div>

          <div className="mt-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {company.name}
            </h1>
            <p className="text-sm text-muted-foreground">{company.industry}</p>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {company.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {company.size}
              </span>
              {company.orgId ? (
                <Badge variant="secondary" className="font-normal">
                  Linked to your Clerk organization — invite teammates from the
                  org switcher
                </Badge>
              ) : (
                <Badge variant="outline" className="font-normal">
                  Owned by your account
                </Badge>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Org billing */}
      <CompanyBillingCard
        openJobs={(jobs ?? []).filter((j) => j.status !== "closed").length}
      />

      {/* Jobs */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Job posts
            {jobs !== undefined && <Badge variant="secondary">{jobs.length}</Badge>}
          </h2>
          <JobDialog companyId={company._id} />
        </div>

        {jobs === undefined ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs yet — post your first role to start receiving applicants.
          </p>
        ) : (
          <JobPostList companyId={company._id} jobs={jobs} />
        )}
      </section>

      {/* Applicants */}
      <ApplicantsPanel
        companyId={company._id}
        jobs={(jobs ?? []).map((j) => ({ _id: j._id, title: j.title }))}
      />

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/30 bg-card p-5">
        <h2 className="font-semibold text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting your company removes the page, every job post, and all
          applications. This can&apos;t be undone.
        </p>
        <div className="mt-3">
          <ConfirmDialog
            title="Delete company?"
            description={`"${company.name}" plus all jobs and applications will be permanently removed.`}
            confirmLabel="Delete company"
            onConfirm={async () => {
              try {
                await deleteCompany({ companyId: company._id });
                toast.success("Company deleted");
                router.push("/feed");
              } catch {
                toast.error("Could not delete the company");
              }
            }}
            renderTrigger={(open) => (
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={open}>
                <Trash2 className="h-4 w-4" />
                Delete company
              </Button>
            )}
          />
        </div>
      </section>
    </div>
  );
}
