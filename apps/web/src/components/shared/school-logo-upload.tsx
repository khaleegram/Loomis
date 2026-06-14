'use client';

import { useCallback } from 'react';
import { useUpdateSchoolBranding } from '@loomis/api-client';

import { PhotoUpload } from '@/components/shared/photo-upload';
import { SchoolLogo } from '@/components/shared/school-logo';

interface SchoolLogoUploadProps {
  tenantId: string;
  schoolName: string;
  logoStorageObjectId: string | null;
  disabled?: boolean;
}

/** Upload or replace the school crest — stored once, used across Loomis. */
export function SchoolLogoUpload({
  tenantId,
  schoolName,
  logoStorageObjectId,
  disabled = false,
}: SchoolLogoUploadProps) {
  const updateBranding = useUpdateSchoolBranding(tenantId);

  const onPhotoSet = useCallback(
    (storageObjectId: string) => {
      void updateBranding.mutateAsync({
        logoStorageObjectId: storageObjectId || null,
      });
    },
    [updateBranding],
  );

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <SchoolLogo
        schoolName={schoolName}
        logoStorageObjectId={logoStorageObjectId}
        size="lg"
      />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <PhotoUpload
          ownerResourceId={tenantId}
          ownerResourceType="tenant_logo"
          classification="public_tenant"
          photoStorageObjectId={logoStorageObjectId}
          fullName={schoolName}
          onPhotoSet={onPhotoSet}
          size={80}
          uploadLabel="Upload school logo"
          disabled={disabled || updateBranding.isPending}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
          PNG or JPG, square works best. Appears on report cards, the app bar, and printable
          documents.
        </p>
      </div>
    </div>
  );
}
