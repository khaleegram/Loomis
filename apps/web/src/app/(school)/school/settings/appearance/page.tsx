'use client';

import { useSchoolBranding } from '@loomis/api-client';
import { Skeleton } from '@loomis/ui-web';

import { SchoolLogoUpload } from '@/components/shared/school-logo-upload';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AppearanceSettingsPage() {
  const tenantId = useTenantId();
  const { session } = useAuth();
  const { data: branding, isLoading } = useSchoolBranding(tenantId ?? '');

  const canEditBranding =
    session?.role != null &&
    ['school_owner', 'principal', 'admin_officer'].includes(session.role);

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">No school context.</p>;
  }

  return (
    <section className="max-w-xl">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your school identity across Loomis — report cards, documents, and the app bar.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-medium text-foreground">School logo</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your crest or mark. Parents and staff see it on official reports.
        </p>
        <div className="mt-5">
          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <SchoolLogoUpload
              tenantId={tenantId}
              schoolName={branding?.tenantName ?? 'School'}
              logoStorageObjectId={branding?.branding.logoStorageObjectId ?? null}
              disabled={!canEditBranding}
            />
          )}
        </div>
        {!canEditBranding ? (
          <p className="mt-3 text-[11px] text-neutral-500">
            Only the school owner, principal, or admin officer can change the logo.
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-medium text-foreground">Colour theme</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Loomis uses a fixed premium light interface — your logo carries the brand.
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <span className="size-3 rounded-full bg-brand-500 ring-2 ring-brand-200" aria-hidden />
          <p className="text-sm font-medium text-brand-700">Light mode (always on)</p>
        </div>
      </div>
    </section>
  );
}
