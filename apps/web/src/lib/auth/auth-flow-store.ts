import { create } from 'zustand';
import type { MfaChannel } from '@loomis/core';

/**
 * Transient, in-memory state for the multi-step login flow (loomis-frontend:
 * Zustand for client/UI state / multi-step form drafts). NEVER persisted — the
 * MFA challenge id and the enrollment JWT live only in memory for the duration
 * of the flow, so a JWT never touches localStorage/sessionStorage.
 */
interface AuthFlowState {
  mfaChallengeId: string | null;
  mfaChannel: MfaChannel | null;
  maskedPhone: string | null;
  devBypass: boolean;
  enrollmentToken: string | null;
  setMfaChallenge: (id: string, meta?: { channel?: MfaChannel; maskedPhone?: string; devBypass?: boolean }) => void;
  setEnrollmentToken: (token: string) => void;
  reset: () => void;
}

export const useAuthFlow = create<AuthFlowState>((set) => ({
  mfaChallengeId: null,
  mfaChannel: null,
  maskedPhone: null,
  devBypass: false,
  enrollmentToken: null,
  setMfaChallenge: (id, meta) =>
    set({
      mfaChallengeId: id,
      mfaChannel: meta?.channel ?? 'totp',
      maskedPhone: meta?.maskedPhone ?? null,
      devBypass: meta?.devBypass ?? false,
    }),
  setEnrollmentToken: (token) => set({ enrollmentToken: token }),
  reset: () =>
    set({
      mfaChallengeId: null,
      mfaChannel: null,
      maskedPhone: null,
      devBypass: false,
      enrollmentToken: null,
    }),
}));
