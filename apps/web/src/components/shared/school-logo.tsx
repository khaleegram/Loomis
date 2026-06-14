'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { usePhotoUrl } from '@loomis/api-client';

type SchoolLogoSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<SchoolLogoSize, string> = {
  xs: 'size-6 rounded-md',
  sm: 'size-8 rounded-lg',
  md: 'size-16 rounded-2xl',
  lg: 'size-20 rounded-2xl',
};

const ICON_CLASS: Record<SchoolLogoSize, string> = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-8',
  lg: 'size-10',
};

const INITIAL_CLASS: Record<SchoolLogoSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-[11px]',
  md: 'text-xl',
  lg: 'text-2xl',
};

export interface SchoolLogoProps {
  schoolName: string;
  logoStorageObjectId?: string | null;
  size?: SchoolLogoSize;
  className?: string;
  /** Direct URL override (upload preview). */
  src?: string | null;
}

/** School crest — uploaded logo or branded shield fallback. Used across reports and chrome. */
export function SchoolLogo({
  schoolName,
  logoStorageObjectId,
  size = 'md',
  className = '',
  src: srcOverride,
}: SchoolLogoProps) {
  const { data } = usePhotoUrl(logoStorageObjectId);
  const [broken, setBroken] = useState(false);

  const remoteUrl = srcOverride ?? data?.downloadUrl ?? null;
  const showImage = Boolean(remoteUrl) && !broken;
  const initial = schoolName.trim().charAt(0).toUpperCase() || 'S';

  if (showImage) {
    return (
      <img
        src={remoteUrl!}
        alt={`${schoolName} logo`}
        className={`shrink-0 border border-neutral-200 bg-white object-contain p-1 ${SIZE_CLASS[size]} ${className}`.trim()}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center border-2 border-brand-200/90 bg-white shadow-sm ${SIZE_CLASS[size]} ${className}`.trim()}
      aria-hidden={size === 'xs' || size === 'sm'}
    >
      {size === 'md' || size === 'lg' ? (
        <Shield className={`${ICON_CLASS[size]} text-brand-700`} strokeWidth={1.25} />
      ) : (
        <span className={`font-extrabold text-brand-800 ${INITIAL_CLASS[size]}`}>{initial}</span>
      )}
    </div>
  );
}
