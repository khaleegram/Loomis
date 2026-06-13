'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { Camera, ImageUp, Loader2, X } from 'lucide-react';
import type { CreateUploadUrlResponse, StorageClassification } from '@loomis/contracts';
import { useApiClient } from '@loomis/api-client';
import { usePhotoUrl } from '@loomis/api-client';
import { ProfileAvatar } from '@/components/shared/profile-avatar';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface PhotoUploadProps {
  /** UUID of the resource that owns this photo (user id, staff profile id, student id, etc.). */
  ownerResourceId: string;
  /** Storage owner type label (defaults to profile_photo). */
  ownerResourceType?: string;
  /** Data classification for the upload (defaults to internal). */
  classification?: StorageClassification;
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PhotoUpload({
  ownerResourceId,
  ownerResourceType = 'profile_photo',
  classification = 'internal',
  photoStorageObjectId,
  fullName,
  onPhotoSet,
  size = 96,
  uploadLabel = 'Upload photo',
  disabled = false,
  required = false,
}: PhotoUploadProps) {
  const client = useApiClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { data: photoUrlData } = usePhotoUrl(photoStorageObjectId);
  const photoUrl = photoUrlData?.downloadUrl ?? null;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl ?? photoUrl;
  const hasPhoto = Boolean(displayUrl || photoStorageObjectId);
  const pickerDisabled = disabled || uploading;

  const openPicker = useCallback(() => {
    if (pickerDisabled) return;
    inputRef.current?.click();
  }, [pickerDisabled]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!UUID_RE.test(ownerResourceId)) {
        setError('Profile is still loading. Wait a moment and try again.');
        return;
      }

      setUploading(true);

      try {
        const arrayBuf = await file.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
        const sha256 = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        const localPreview = URL.createObjectURL(file);
        setPreviewUrl(localPreview);

        const uploadUrlRes = await client.post<CreateUploadUrlResponse>(
          '/storage/upload-url',
          {
            ownerResourceType,
            ownerResourceId,
            classification,
            contentType: file.type,
            contentLengthBytes: file.size,
            contentSha256: sha256,
          },
        );

        await client.put(
          `/storage/objects/${uploadUrlRes.storageObjectId}/content`,
          file,
          { headers: { 'Content-Type': file.type } },
        );

        onPhotoSet(uploadUrlRes.storageObjectId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
        setPreviewUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [client, classification, onPhotoSet, ownerResourceId, ownerResourceType],
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
      <button
        type="button"
        disabled={pickerDisabled}
        className="group relative overflow-hidden rounded-full ring-2 ring-brand-100 transition-all hover:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ width: size, height: size }}
        onClick={openPicker}
        aria-label={uploadLabel}
      >
        <ProfileAvatar
          photoStorageObjectId={photoStorageObjectId}
          src={displayUrl}
          alt={fullName}
          rounded="full"
        />

        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
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
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onInputChange}
        tabIndex={-1}
        aria-hidden
      />

      <div className="flex items-center gap-1.5">
        {required && !hasPhoto ? (
          <span className="text-[11px] font-semibold text-red-500">Required</span>
        ) : null}
        <button
          type="button"
          disabled={pickerDisabled}
          className="inline-flex min-h-[44px] items-center text-[11px] text-neutral-400 underline-offset-2 hover:text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
          onClick={openPicker}
        >
          {uploading ? 'Uploading...' : hasPhoto ? 'Change photo' : uploadLabel}
        </button>
        {hasPhoto && !disabled ? (
          <button
            type="button"
            className="ml-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-neutral-300 hover:bg-red-50 hover:text-red-400 sm:min-h-0 sm:min-w-0 sm:p-0.5"
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
        <p className="max-w-xs text-center text-[11px] text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
