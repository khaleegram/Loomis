'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAcademicSetupPreferences,
  useCreateGradingScheme,
  useGradingSchemes,
  useUpsertAcademicSetupPreferences,
} from '@loomis/api-client';
import { ArrowLeft, ArrowRight, Check, GraduationCap } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ChipOptionPicker } from '@/components/shared/smart-form';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  buildGradingSchemePayload,
  DEFAULT_CA_WEIGHT,
  DEFAULT_EXAM_WEIGHT,
  DEFAULT_RESULT_PREFERENCES,
  type ResultSetupPreferences,
} from '@/lib/academic/default-result-setup';
import { SEMANTIC } from '@/lib/design/surfaces';

type Step = 'scoring' | 'grades' | 'position' | 'done';

interface ResultSetupWizardProps {
  tenantId: string;
}

const SCORING_OPTIONS = [
  { value: '40-60', label: 'CA 40 + Exam 60 (most common)' },
  { value: '30-70', label: 'CA 30 + Exam 70' },
  { value: '50-50', label: 'CA 50 + Exam 50' },
];

export function ResultSetupWizard({ tenantId }: ResultSetupWizardProps) {
  const router = useRouter();
  const preferencesQuery = useAcademicSetupPreferences(tenantId);
  const upsertPreferences = useUpsertAcademicSetupPreferences(tenantId);
  const schemesQuery = useGradingSchemes(tenantId);
  const createScheme = useCreateGradingScheme(tenantId);
  const hasScheme = (schemesQuery.data?.schemes.length ?? 0) > 0;

  const [step, setStep] = useState<Step>('scoring');
  const [prefs, setPrefs] = useState<ResultSetupPreferences>(
    preferencesQuery.data?.results ?? DEFAULT_RESULT_PREFERENCES,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preferencesQuery.data?.results) {
      setPrefs(preferencesQuery.data.results);
    }
  }, [preferencesQuery.data]);

  const scoringValue =
    prefs.caWeight === 40 && prefs.examWeight === 60
      ? '40-60'
      : prefs.caWeight === 30 && prefs.examWeight === 70
        ? '30-70'
        : prefs.caWeight === 50 && prefs.examWeight === 50
          ? '50-50'
          : '40-60';

  async function finishSetup() {
    setError(null);
    try {
      await upsertPreferences.mutateAsync({ results: prefs });
      if (hasScheme) {
        setStep('done');
        return;
      }
      await createScheme.mutateAsync(buildGradingSchemePayload(prefs));
      setStep('done');
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {error ? (
        <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{error}</div>
      ) : null}

      {step === 'scoring' ? (
        <div className="space-y-6">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Result setup</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
              How do you score students?
            </h2>
            <p className="mt-1.5 text-[14px] text-neutral-500">
              Most Nigerian schools use Continuous Assessment (CA) plus Exam. We&apos;ll create your
              gradebook columns from this.
            </p>
          </div>
          <ChipOptionPicker
            options={SCORING_OPTIONS}
            value={scoringValue}
            onChange={(v) => {
              const weights =
                v === '30-70'
                  ? { caWeight: 30, examWeight: 70 }
                  : v === '50-50'
                    ? { caWeight: 50, examWeight: 50 }
                    : { caWeight: DEFAULT_CA_WEIGHT, examWeight: DEFAULT_EXAM_WEIGHT };
              setPrefs((p) => ({ ...p, ...weights }));
            }}
          />
          <div className="flex justify-between">
            <button type="button" onClick={() => router.push('/school/academic')} className={ACADEMIC_UI.btnSecondary}>
              <ArrowLeft aria-hidden className="size-4" />
              Back
            </button>
            <button type="button" onClick={() => setStep('grades')} className={ACADEMIC_UI.btnPrimary}>
              Continue
              <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {step === 'grades' ? (
        <div className="space-y-6">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Result setup</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
              Do you use letter grades?
            </h2>
            <p className="mt-1.5 text-[14px] text-neutral-500">
              A, B, C, D, E, F with remarks like Excellent, Very Good, etc.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: true, label: 'Yes, use A-F grades', hint: 'Standard Nigerian grading' },
              { value: false, label: 'No, scores only', hint: 'Show numeric totals only' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, useGrades: opt.value }))}
                className={cn(
                  'card rounded-2xl p-5 text-left transition',
                  prefs.useGrades === opt.value && 'ring-2 ring-brand-300',
                )}
              >
                <p className="text-[15px] font-bold text-neutral-900">{opt.label}</p>
                <p className="mt-1 text-[13px] text-neutral-500">{opt.hint}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep('scoring')} className={ACADEMIC_UI.btnSecondary}>
              Back
            </button>
            <button type="button" onClick={() => setStep('position')} className={ACADEMIC_UI.btnPrimary}>
              Continue
              <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {step === 'position' ? (
        <div className="space-y-6">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Result setup</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
              Do you calculate class position?
            </h2>
            <p className="mt-1.5 text-[14px] text-neutral-500">
              1st, 2nd, 3rd in class - common on report cards. You can hide it from parents if you
              prefer.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { calc: true, show: true, label: 'Yes, show on report cards', hint: 'Most schools do this' },
              { calc: true, show: false, label: 'Calculate but hide from parents', hint: 'Internal use only' },
              { calc: false, show: false, label: 'No position', hint: 'Scores and grades only' },
            ].map((opt) => {
              const selected =
                prefs.calculatePosition === opt.calc && prefs.showPositionOnReport === opt.show;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() =>
                    setPrefs((p) => ({
                      ...p,
                      calculatePosition: opt.calc,
                      showPositionOnReport: opt.show,
                    }))
                  }
                  className={cn(
                    'card rounded-2xl p-5 text-left transition',
                    selected && 'ring-2 ring-brand-300',
                  )}
                >
                  <p className="text-[15px] font-bold text-neutral-900">{opt.label}</p>
                  <p className="mt-1 text-[13px] text-neutral-500">{opt.hint}</p>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep('grades')} className={ACADEMIC_UI.btnSecondary}>
              Back
            </button>
            <button
              type="button"
              disabled={createScheme.isPending || upsertPreferences.isPending}
              onClick={() => void finishSetup()}
              className={ACADEMIC_UI.btnPrimary}
            >
              {createScheme.isPending || upsertPreferences.isPending ? 'Saving…' : hasScheme ? 'Save preferences' : 'Create grading scheme'}
              <Check aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {step === 'done' ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <GraduationCap aria-hidden className="size-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">
              Results are ready to configure
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] text-neutral-500">
              Teachers can enter CA and Exam scores. Exam Officer publishes when ready.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => router.push('/school/gradebook')} className={ACADEMIC_UI.btnPrimary}>
              Open gradebook
            </button>
            <button type="button" onClick={() => router.push('/school/academic')} className={ACADEMIC_UI.btnSecondary}>
              Back to Academic
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
