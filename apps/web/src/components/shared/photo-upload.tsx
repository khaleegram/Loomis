'use client';

import { useCallback, useState } from 'react';
import { Camera, ImageUp, Loader2, X } from 'lucide-react';
import type { CreateUploadUrlResponse } from '@loomis/contracts';
import { useApiClient } from '@loomis/api-client';
import { usePhotoUrl } from '@loomis/api-client';
import { ProfileAvatar } from '@/components/shared/profile-avatar';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface PhotoUploadProps {
  /** Storage object ID for an existing photo (null/undefined = no photo). */
  photoStorageObjectId: string | null | undefined;
  /** Full name for the initials fallback. */
  fullName: string;
  /** Called after upload + association — passes the new storage object ID. */
  onPhotoSet: (storageObjectId: string) => void;
  /** Optionally override the size (default 96px). */
  size?: number;
  /** Accessibility label for the upload button. */
  uploadLabel?: string;
  /** Disable the upload button. */
  disabled?: boolean;
  /** Whether the photo is required (shows "Required" badge). */
  required?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PhotoUpload({
  photoStorageObjectId,
  fullName,
  onPhotoSet,
  size = 96,
  uploadLabel = 'Upload photo',
  disabled = false,
  required = false,
}: PhotoUploadProps) {
  const client = useApiClient();
  const { data: photoUrlData } = usePhotoUrl(photoStorageObjectId);
  const photoUrl = photoUrlData?.downloadUrl ?? null;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl ?? photoUrl;
  const hasPhoto = Boolean(displayUrl || photoStorageObjectId);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      try {
        // 1. Read file for preview + SHA-256
        const arrayBuf = await file.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
        const sha256 = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        // Show local preview immediately
        const localPreview = URL.createObjectURL(file);
        setPreviewUrl(localPreview);

        // 2. Request presigned upload URL
        const uploadUrlRes = await client.post<CreateUploadUrlResponse>(
          '/storage/upload-url',
          {
            ownerResourceType: 'profile_photo',
            ownerResourceId: 'pending',
            classification: 'internal',
            contentType: file.type,
            contentLengthBytes: file.size,
            contentSha256: sha256,
          },
        );

        // 3. Upload to S3
        const s3Res = await fetch(uploadUrlRes.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': uploadUrlRes.requiredHeaders['Content-Type'],
            'Content-Length': uploadUrlRes.requiredHeaders['Content-Length'],
          },
        });

        if (!s3Res.ok) {
          throw new Error(`Upload failed: ${s3Res.status}`);
        }

        // 4. Notify parent
        onPhotoSet(uploadUrlRes.storageObjectId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
        setPreviewUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [client, onPhotoSet],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Photo circle */}
      <button
        type="button"
        disabled={disabled || uploading}
        className="group relative overflow-hidden rounded-full ring-2 ring-brand-100 transition-all hover:ring-brand-300 disabled:opacity-60"
        style={{ width: size, height: size }}
        onClick={() => document.getElementById(`photo-input-${fullName.replace(/\s+/g, '')}`)?.click()}
        aria-label={uploadLabel}
      >
        <ProfileAvatar
          photoStorageObjectId={photoStorageObjectId}
          src={displayUrl}
          alt={fullName}
          rounded="full"
        />

        {/* Upload overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {uploading ? (
            <Loader2 aria-hidden className="size-5 animate-spin text-white" />
          ) : hasPhoto ? (
            <Camera aria-hidden className="size-5 text-white" />
          ) : (
            <ImageUp aria-hidden className="size-5 text-white" />
          )}
        </div>
      </button>

      <input
        id={`photo-input-${fullName.replace(/\s+/g, '')}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled || uploading}
      />

      {/* Label */}
      <div className="flex items-center gap-1.5">
        {required && !hasPhoto ? (
          <span className="text-[11px] font-semibold text-red-500">Required</span>
        ) : null}
        <span className="text-[11px] text-neutral-400">
          {uploading ? 'Uploading...' : hasPhoto ? 'Change photo' : uploadLabel}
        </span>
        {hasPhoto && !disabled ? (
          <button
            type="button"
            className="ml-1 rounded-full p-0.5 text-neutral-300 hover:bg-red-50 hover:text-red-400"
            onClick={() => {
              setPreviewUrl(null);
              onPhotoSet('');
            }}
            aria-label="Remove photo"
          >
            <X aria-hidden className="size-3" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-[11px] text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
