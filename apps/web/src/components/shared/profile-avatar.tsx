'use client';

import { useState } from 'react';
import { usePhotoUrl } from '@loomis/api-client';

import { DEFAULT_PROFILE_IMAGE } from '@/lib/shared/default-profile';

type ProfileAvatarRounded = 'full' | 'xl' | '2xl' | 'none';

const ROUNDED_CLASS: Record<ProfileAvatarRounded, string> = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  none: '',
};

export interface ProfileAvatarProps {
  photoStorageObjectId?: string | null;
  alt: string;
  className?: string;
  rounded?: ProfileAvatarRounded;
  /** Optional direct URL (e.g. local upload preview). Takes precedence over storage object. */
  src?: string | null;
}

export function ProfileAvatar({
  photoStorageObjectId,
  alt,
  className = '',
  rounded = 'full',
  src: srcOverride,
}: ProfileAvatarProps) {
  const { data } = usePhotoUrl(photoStorageObjectId);
  const [broken, setBroken] = useState(false);

  const remoteUrl = srcOverride ?? data?.downloadUrl ?? null;
  const src = !broken && remoteUrl ? remoteUrl : DEFAULT_PROFILE_IMAGE;

  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full bg-neutral-100 object-cover ${ROUNDED_CLASS[rounded]} ${className}`.trim()}
      onError={() => setBroken(true)}
    />
  );
}
