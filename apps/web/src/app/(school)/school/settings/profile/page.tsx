'use client';

import { useCallback, useState } from 'react';
import { Check, Key, Loader2, Pencil, Settings, X } from 'lucide-react';
import Link from 'next/link';
import type { FormEvent } from 'react';

import {
  useChangePassword,
  useMyProfile,
  useSchoolBranding,
  useUpdateProfile,
} from '@loomis/api-client';
import { Button } from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { getUserIdFromAccessToken } from '@/lib/auth/user-id';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { PhotoUpload } from '@/components/shared/photo-upload';
import { ThemeToggle } from '@/components/settings/theme-toggle';

export default function ProfileSettingsPage() {
  const { session } = useAuth();
  const tenantId = useTenantId();

  const { data: profile, refetch: refetchProfile } = useMyProfile();
  const { data: branding } = useSchoolBranding(tenantId ?? '');
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

  const ownerUserId =
    profile?.userId ??
    (session ? getUserIdFromAccessToken(session.accessToken) : null) ??
    '';
  const saving = updateProfile.isPending;

  const handlePhotoSet = useCallback(
    (storageObjectId: string) => {
      updateProfile.mutate(
        { photoStorageObjectId: storageObjectId || null },
        { onSuccess: () => { void refetchProfile(); } },
      );
    },
    [updateProfile, refetchProfile],
  );

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

  return (
    <div className="max-w-2xl space-y-6">
      {/* Flash message */}
      {flash ? (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-[13px] ${
            flash.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200'
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
          <h1 className="truncate text-xl font-bold text-foreground">{displayName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{roleLabel}</p>
          {tenantId ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground/80">
              {branding?.tenantName ?? 'Your school'}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground/80">Platform account</p>
          )}
        </div>
      </div>

      {/* Photo card */}
      <div className="hero-panel rounded-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Profile photo</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Upload a portrait-style passport photo. JPG, PNG, or WebP.
          </p>
        </div>
        <div className="px-5 py-5">
          <PhotoUpload
            ownerResourceId={ownerUserId}
            ownerResourceType="identity_user"
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
      <div className="hero-panel rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Display name</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">How you appear across the platform.</p>
          </div>
          {!editingName ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] text-muted-foreground hover:text-primary"
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
                className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
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
                className="h-9 rounded-lg px-2 text-[12px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-[14px] font-medium text-foreground">{displayName || '—'}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="hero-panel rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Email address</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Used for login and notifications.</p>
          </div>
          {!editingEmail ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] text-muted-foreground hover:text-primary"
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
                className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
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
                className="h-9 rounded-lg px-2 text-[12px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-[14px] font-medium text-foreground">{userEmail || '—'}</p>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="hero-panel rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Password</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Change your account password.</p>
          </div>
          {!showPasswordForm ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] text-muted-foreground hover:text-primary"
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
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Current password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                  placeholder="Enter current password"
                  disabled={changePassword.isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                  placeholder="At least 8 characters"
                  disabled={changePassword.isPending}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Must include uppercase, lowercase, digit, and special character.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={8}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
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
                  className="h-9 rounded-lg px-3 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-[14px] font-medium text-muted-foreground">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</p>
          )}
        </div>
      </div>

      {/* Interface theme */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Interface theme</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Personal preference — applies across school, parent, and platform consoles on this device.
          </p>
        </div>
        <div className="px-5 py-4">
          <ThemeToggle />
        </div>
      </div>

      {/* Quick links */}
      <div className="hero-panel rounded-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Quick links</h2>
        </div>
        <div className="space-y-1 px-5 py-3">
          <Link
            href="/school/settings/security"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Settings aria-hidden className="size-4 text-muted-foreground/70" />
            Security &amp; Sessions
          </Link>
          <Link
            href="/school/settings/appearance"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Settings aria-hidden className="size-4 text-muted-foreground/70" />
            Appearance
          </Link>
        </div>
      </div>
    </div>
  );
}
