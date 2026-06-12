'use client';

import { useCallback, useState } from 'react';
import { Check, Key, Loader2, Pencil, Settings, X } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent } from 'react';

import {
  useChangePassword,
  useMyProfile,
  useUpdateProfile,
} from '@loomis/api-client';
import { Button } from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { PhotoUpload } from '@/components/shared/photo-upload';

export default function ProfileSettingsPage() {
  const { session } = useAuth();
  const tenantId = useTenantId();

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const flashMsg = useCallback((type: 'success' | 'error', message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 4000);
  }, []);

  if (!session) {
    return (
      <p className="text-sm text-muted-foreground">Sign in to view your profile.</p>
    );
  }

  const roleLabel = session.role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const displayName = profile?.displayName ?? session.displayName ?? roleLabel;
  const userEmail = profile?.email ?? '';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handlePhotoSet = useCallback(
    (storageObjectId: string) => {
      updateProfile.mutate(
        { photoStorageObjectId: storageObjectId || null },
        { onSuccess: () => { void refetchProfile(); } },
      );
    },
    [updateProfile, refetchProfile],
  );

  const saveName = () => {
    if (!draftName.trim()) return;
    updateProfile.mutate(
      { displayName: draftName.trim() },
      {
        onSuccess: () => {
          setEditingName(false);
          void refetchProfile();
          flashMsg('success', 'Display name updated');
        },
        onError: (err) => flashMsg('error', err instanceof Error ? err.message : 'Failed to update name'),
      },
    );
  };

  const saveEmail = () => {
    if (!draftEmail.trim()) return;
    updateProfile.mutate(
      { email: draftEmail.trim() },
      {
        onSuccess: () => {
          setEditingEmail(false);
          void refetchProfile();
          flashMsg('success', 'Email updated');
        },
        onError: (err) => flashMsg('error', err instanceof Error ? err.message : 'Failed to update email'),
      },
    );
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      flashMsg('error', 'New passwords do not match');
      return;
    }
    changePassword.mutate(
      { currentPassword: currentPw, newPassword: newPw },
      {
        onSuccess: () => {
          flashMsg('success', 'Password changed');
          setShowPasswordForm(false);
          setCurrentPw('');
          setNewPw('');
          setConfirmPw('');
        },
        onError: (err) => flashMsg('error', err instanceof Error ? err.message : 'Failed to change password'),
      },
    );
  };

  const saving = updateProfile.isPending || profileLoading;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Flash message */}
      {flash ? (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-[13px] ${
            flash.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span>{flash.message}</span>
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="ml-2 rounded-full p-0.5 hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ) : null}

      {/* Profile header */}
      <div className="flex items-start gap-5">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white shadow-lg">
          {initials || '?'}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-neutral-900">{displayName}</h1>
          <p className="mt-0.5 text-sm text-neutral-500">{roleLabel}</p>
          {tenantId ? (
            <p className="mt-0.5 font-mono text-[11px] text-neutral-400">
              Tenant &middot; {tenantId.slice(0, 8)}&hellip;{tenantId.slice(-4)}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-neutral-400">Platform account</p>
          )}
        </div>
      </div>

      {/* Photo card */}
      <div className="rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div className="border-b border-brand-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Profile photo</h2>
          <p className="mt-0.5 text-[12px] text-neutral-400">
            Upload a portrait-style passport photo. JPG, PNG, or WebP.
          </p>
        </div>
        <div className="px-5 py-5">
          <PhotoUpload
            photoStorageObjectId={profile?.photoStorageObjectId}
            fullName={displayName}
            onPhotoSet={handlePhotoSet}
            uploadLabel="Set profile photo"
            size={88}
            disabled={saving}
          />
        </div>
      </div>

      {/* Display name */}
      <div className="rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-50 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Display name</h2>
            <p className="mt-0.5 text-[12px] text-neutral-400">How you appear across the platform.</p>
          </div>
          {!editingName ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] text-neutral-500 hover:text-brand-700"
              onClick={() => { setDraftName(displayName); setEditingName(true); }}
              disabled={saving}
            >
              <Pencil aria-hidden className="size-3" />
              Edit
            </Button>
          ) : null}
        </div>
        <div className="px-5 py-4">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] text-neutral-900 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
                placeholder="Your display name"
                disabled={saving}
              />
              <button
                type="button"
                onClick={saveName}
                disabled={saving || !draftName.trim()}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {updateProfile.isPending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Check aria-hidden className="size-3.5" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                disabled={saving}
                className="h-9 rounded-lg px-2 text-[12px] text-neutral-400 hover:text-neutral-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-[14px] font-medium text-neutral-900">{displayName || '—'}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-50 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Email address</h2>
            <p className="mt-0.5 text-[12px] text-neutral-400">Used for login and notifications.</p>
          </div>
          {!editingEmail ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] text-neutral-500 hover:text-brand-700"
              onClick={() => { setDraftEmail(userEmail); setEditingEmail(true); }}
              disabled={saving}
            >
              <Pencil aria-hidden className="size-3" />
              Edit
            </Button>
          ) : null}
        </div>
        <div className="px-5 py-4">
          {editingEmail ? (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] text-neutral-900 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
                placeholder="you@school.edu.ng"
                disabled={saving}
              />
              <button
                type="button"
                onClick={saveEmail}
                disabled={saving || !draftEmail.trim()}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {updateProfile.isPending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Check aria-hidden className="size-3.5" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingEmail(false)}
                disabled={saving}
                className="h-9 rounded-lg px-2 text-[12px] text-neutral-400 hover:text-neutral-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-[14px] font-medium text-neutral-900">{userEmail || '—'}</p>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-50 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Password</h2>
            <p className="mt-0.5 text-[12px] text-neutral-400">Change your account password.</p>
          </div>
          {!showPasswordForm ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] text-neutral-500 hover:text-brand-700"
              onClick={() => setShowPasswordForm(true)}
            >
              <Key aria-hidden className="size-3" />
              Change
            </Button>
          ) : null}
        </div>
        <div className="px-5 py-4">
          {showPasswordForm ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-600">Current password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-[13px] text-neutral-900 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
                  placeholder="Enter current password"
                  disabled={changePassword.isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-600">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-[13px] text-neutral-900 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
                  placeholder="At least 8 characters"
                  disabled={changePassword.isPending}
                />
                <p className="mt-1 text-[11px] text-neutral-400">
                  Must include uppercase, lowercase, digit, and special character.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-neutral-600">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={8}
                  className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-[13px] text-neutral-900 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
                  placeholder="Re-enter new password"
                  disabled={changePassword.isPending}
                />
              </div>
              {changePassword.isError ? (
                <p className="text-[12px] text-red-500" role="alert">
                  {(changePassword.error as Error).message ?? 'Failed to change password'}
                </p>
              ) : null}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {changePassword.isPending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
                  Change password
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                  disabled={changePassword.isPending}
                  className="h-9 rounded-lg px-3 text-[12px] text-neutral-400 hover:text-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-[14px] font-medium text-neutral-400">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div className="border-b border-brand-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Quick links</h2>
        </div>
        <div className="space-y-1 px-5 py-3">
          <Link
            href="/school/settings/security"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            <Settings aria-hidden className="size-4 text-neutral-400" />
            Security &amp; Sessions
          </Link>
          <Link
            href="/school/settings/appearance"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            <Settings aria-hidden className="size-4 text-neutral-400" />
            Appearance
          </Link>
        </div>
      </div>
    </div>
  );
}
