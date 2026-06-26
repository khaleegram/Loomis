'use client';

import { useCallback, useRef, useState } from 'react';
import { ImageUp, Loader2, X } from 'lucide-react';
import type { CreateUploadUrlResponse } from '@loomis/contracts';
import { useApiClient, usePhotoUrl } from '@loomis/api-client';

interface WebsiteImageFieldProps {
  /** Tenant id — used as the storage owner resource id. */
  tenantId: string;
  /** Currently selected public storage object id (or null). */
  storageObjectId: string | null;
  /** Called with the new storage object id (or null when cleared). */
  onChange: (storageObjectId: string | null) => void;
  label: string;
  /** Tailwind aspect/height classes for the preview frame. */
  frameClassName?: string;
  disabled?: boolean;
}

/**
 * Rectangular image picker for public website assets (hero background, about
 * image, principal photo, gallery images). Uploads as `public_tenant` so the
 * public renderer can resolve a presigned URL for visitors.
 */
export function WebsiteImageField({
  tenantId,
  storageObjectId,
  onChange,
  label,
  frameClassName = 'aspect-video',
  disabled = false,
}: WebsiteImageFieldProps) {
  const client = useApiClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: urlData } = usePhotoUrl(storageObjectId);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl ?? urlData?.downloadUrl ?? null;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const arrayBuf = await file.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
        const sha256 = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        setPreviewUrl(URL.createObjectURL(file));

        const uploadUrlRes = await client.post<CreateUploadUrlResponse>(
          '/storage/upload-url',
          {
            ownerResourceType: 'website_asset',
            ownerResourceId: tenantId,
            classification: 'public_tenant',
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

        onChange(uploadUrlRes.storageObjectId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
        setPreviewUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [client, onChange, tenantId],
  );

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-neutral-600">{label}</p>
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50 ${frameClassName}`}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-400">
            <ImageUp className="size-6" aria-hidden />
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="size-6 animate-spin text-white" aria-hidden />
          </div>
        ) : null}
        {displayUrl && !disabled ? (
          <button
            type="button"
            onClick={() => {
              setPreviewUrl(null);
              onChange(null);
            }}
            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label="Remove image"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:py-2"
        >
          {uploading ? 'Uploading…' : displayUrl ? 'Replace image' : 'Upload image'}
        </button>
        {error ? <span className="text-[11px] text-red-500">{error}</span> : null}
      </div>
    </div>
  );
}
