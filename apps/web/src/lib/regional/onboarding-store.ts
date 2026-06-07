import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4;

export interface OnboardingDraft {
  step: OnboardingStep;
  name: string;
  region: string;
  contactEmail: string;
  address: string;
  lga: string;
  schoolType: string;
  estimatedEnrollment: string;
  proprietorName: string;
  proprietorPhone: string;
  tierCode: string;
  conflictDeclared: boolean;
}

const INITIAL: OnboardingDraft = {
  step: 0,
  name: '',
  region: '',
  contactEmail: '',
  address: '',
  lga: '',
  schoolType: '',
  estimatedEnrollment: '',
  proprietorName: '',
  proprietorPhone: '',
  tierCode: '',
  conflictDeclared: false,
};

interface OnboardingStore {
  draft: OnboardingDraft;
  setField: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  setStep: (step: OnboardingStep) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      draft: INITIAL,
      setField: (key, value) =>
        set((state) => ({ draft: { ...state.draft, [key]: value } })),
      setStep: (step) => set((state) => ({ draft: { ...state.draft, step } })),
      reset: () => set({ draft: INITIAL }),
    }),
    { name: 'loomis-regional-onboarding-draft' },
  ),
);
