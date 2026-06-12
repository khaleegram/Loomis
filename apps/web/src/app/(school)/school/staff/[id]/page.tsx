'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStaffMember, useSetStaffPhoto } from '@loomis/api-client';
import { Alert, AlertDescription, Button, Skeleton } from '@loomis/ui-web';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useCallback } from 'react';

import { StaffMemberDetail } from '@/components/staff/staff-member-detail';
import { StaffProfileHeader, StaffProfileHeaderSkeleton } from '@/components/staff/staff-profile-header';
import { StaffAuditTimeline } from '@/components/staff/staff-audit-timeline';
import { PhotoUpload } from '@/components/shared/photo-upload';
import { PageBody } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function StaffProfilePage() {
  const params = useParams<{ id: string }>();
  const staffProfileId = params.id;
  const tenantId = useTenantId();

  const { data: staff, isLoading, isError } = useStaffMember(tenantId ?? '', staffProfileId);
  const setPhotoMutation = useSetStaffPhoto(tenantId ?? '');

  const handlePhotoSet = useCallback(
    (storageObjectId: string) => {
      if (storageObjectId) {
        setPhotoMutation.mutate({ staffProfileId, storageObjectId });
      }
    },
    [setPhotoMutation, staffProfileId],
  );

  const invitationExpired =
    staff?.pendingInvitation != null &&
    new Date(staff.pendingInvitation.expiresAt) <= new Date();

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1200px] px-6 py-6 lg:px-8 lg:py-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[1200px] px-6 py-6 lg:px-8 lg:py-8">
      <div className="space-y-6">
        {/* Breadcrumb + Back */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            <Link href="/school/staff" className="hover:text-brand-600 transition-colors">
              Staff Management
            </Link>
            <span className="text-neutral-200">/</span>
            <span className="text-neutral-500">
              {isLoading ? 'Loading…' : staff?.fullName ?? 'Profile'}
            </span>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 border-neutral-200 hover:border-brand-200" asChild>
            <Link href="/school/staff">
              <ArrowLeft aria-hidden className="size-3.5" />
              Back to directory
            </Link>
          </Button>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-6">
            <StaffProfileHeaderSkeleton />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : isError || !staff ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-red-50">
              <AlertTriangle className="size-8 text-red-300" />
            </div>
            <h2 className="text-lg font-bold text-neutral-800">Staff member not found</h2>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              The staff profile you&rsquo;re looking for doesn&rsquo;t exist or has been removed.
            </p>
            <Button variant="outline" size="sm" className="mt-5 gap-1.5" asChild>
              <Link href="/school/staff">
                <ArrowLeft aria-hidden className="size-3.5" />
                Return to directory
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Header */}
            <StaffProfileHeader staff={staff} />

            {/* Optional photo upload — all roles */}
            <div className="card rounded-2xl p-5">
              <PhotoUpload
                photoStorageObjectId={staff.photoStorageObjectId}
                fullName={staff.fullName}
                onPhotoSet={handlePhotoSet}
                uploadLabel="Set profile photo"
              />
            </div>

            {/* Expired invitation warning */}
            {staff.status === 'pending' && invitationExpired ? (
              <Alert variant="warning" className="rounded-2xl border-l-4 border-l-amber-500">
                <AlertDescription>
                  This invitation has expired. Resend from the Role &amp; Access tab to issue a new 48-hour setup link.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Profile Content (Tabs) */}
            <StaffMemberDetail staffProfileId={staffProfileId} staff={staff} />

            {/* Audit Timeline */}
            <StaffAuditTimeline staff={staff} />
          </div>
        )}
      </div>
    </PageBody>
  );
}


