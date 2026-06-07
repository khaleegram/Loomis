import { create } from 'zustand';

/**
 * Transient, in-memory state for the multi-step login flow (loomis-frontend:
 * Zustand for client/UI state / multi-step form drafts). NEVER persisted — the
 * MFA challenge id and the enrollment JWT live only in memory for the duration
 * of the flow, so a JWT never touches localStorage/sessionStorage.
 */
interface AuthFlowState {
  mfaChallengeId: string | null;
  enrollmentToken: string | null;
  setMfaChallenge: (id: string) => void;
  setEnrollmentToken: (token: string) => void;
  reset: () => void;
}

export const useAuthFlow = create<AuthFlowState>((set) => ({
  mfaChallengeId: null,
  enrollmentToken: null,
  setMfaChallenge: (id) => set({ mfaChallengeId: id }),
  setEnrollmentToken: (token) => set({ enrollmentToken: token }),
  reset: () => set({ mfaChallengeId: null, enrollmentToken: null }),
}));
