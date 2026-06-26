'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAcademicYears,
  useClassLevels,
  useClassStructure,
  useSetupClassArms,
  useSetupClassLevels,
} from '@loomis/api-client';
import { cn } from '@loomis/ui-web';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  Layers,
  Search,
  Sparkles,
} from 'lucide-react';

import { ArmLetterDialog } from '@/components/academic/setup/arm-letter-dialog';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { pickActiveYear } from '@/lib/academic/academic-session-utils';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  buildLevelsPayload,
  DEFAULT_CLASS_LADDER,
  LADDER_STAGES,
  type LadderStage,
} from '@/lib/academic/default-class-ladder';
import { SEMANTIC } from '@/lib/design/surfaces';

type Step = 'levels' | 'arms-question' | 'arms-picker' | 'done';

interface AcademicSetupWizardProps {
  tenantId: string;
}

export function AcademicSetupWizard({ tenantId }: AcademicSetupWizardProps) {
  const router = useRouter();

  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYear = useMemo(
    () => pickActiveYear(years) ?? years.find((y) => y.status === 'draft') ?? years[0] ?? null,
    [years],
  );

  const levelsQuery = useClassLevels(tenantId);
  const existingLevels = levelsQuery.data?.levels ?? [];

  const setupLevels = useSetupClassLevels(tenantId);

  // Step state ----------------------------------------------------------------
  const [step, setStep] = useState<Step>('levels');
  const [error, setError] = useState<string | null>(null);

  // Pre-select: matching existing ladder codes if a school already started, else all.
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => {
    const existingCodes = new Set(existingLevels.map((l) => l.code));
    const matched = DEFAULT_CLASS_LADDER.filter((l) => existingCodes.has(l.code)).map((l) => l.code);
    return matched.length > 0
      ? new Set(matched)
      : new Set(DEFAULT_CLASS_LADDER.map((l) => l.code));
  });

  const orderedSelected = useMemo(
    () => DEFAULT_CLASS_LADDER.filter((l) => selectedCodes.has(l.code)),
    [selectedCodes],
  );
  const graduationLevel = orderedSelected[orderedSelected.length - 1] ?? null;

  function toggleLevel(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleStage(stage: LadderStage, on: boolean) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      for (const level of DEFAULT_CLASS_LADDER) {
        if (level.stage === stage) {
          if (on) next.add(level.code);
          else next.delete(level.code);
        }
      }
      return next;
    });
  }

  async function saveLevels(advanceTo: Step) {
    setError(null);
    if (selectedCodes.size === 0) {
      setError('Pick at least one class your school runs.');
      return;
    }
    try {
      await setupLevels.mutateAsync({ levels: buildLevelsPayload(selectedCodes) });
      setStep(advanceTo);
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <WizardProgress step={step} />

      <div className="mt-6">
        {error ? (
          <div className={`mb-5 rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{error}</div>
        ) : null}

        {step === 'levels' ? (
          <LevelsStep
            selectedCodes={selectedCodes}
            graduationName={graduationLevel?.name ?? null}
            onToggleLevel={toggleLevel}
            onToggleStage={toggleStage}
            pending={setupLevels.isPending}
            onContinue={() => saveLevels('arms-question')}
            onSkip={() => router.push('/school/academic')}
          />
        ) : null}

        {step === 'arms-question' ? (
          <ArmsQuestionStep
            onBack={() => setStep('levels')}
            onNo={() => setStep('done')}
            onYes={() => setStep('arms-picker')}
          />
        ) : null}

        {step === 'arms-picker' ? (
          <ArmsPickerStep
            tenantId={tenantId}
            academicYearId={activeYear?.id ?? null}
            yearLabel={activeYear?.label ?? null}
            onBack={() => setStep('arms-question')}
            onDone={() => setStep('done')}
          />
        ) : null}

        {step === 'done' ? (
          <DoneStep
            levelCount={orderedSelected.length}
            onFinish={() => router.push('/school/academic')}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Progress rail ────────────────────────────────────────────────────────────

const PROGRESS_STEPS: { id: Step; label: string }[] = [
  { id: 'levels', label: 'Classes' },
  { id: 'arms-question', label: 'Arms' },
  { id: 'done', label: 'Done' },
];

function progressIndex(step: Step): number {
  if (step === 'levels') return 0;
  if (step === 'arms-question' || step === 'arms-picker') return 1;
  return 2;
}

function WizardProgress({ step }: { step: Step }) {
  const active = progressIndex(step);
  return (
    <div className="flex items-center gap-2">
      {PROGRESS_STEPS.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                  done && 'bg-brand-600 text-white',
                  current && 'bg-brand-100 text-brand-800 ring-2 ring-brand-300',
                  !done && !current && 'bg-neutral-100 text-neutral-400',
                )}
              >
                {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[12px] font-semibold',
                  current ? 'text-neutral-900' : 'text-neutral-400',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < PROGRESS_STEPS.length - 1 ? (
              <span className={cn('h-px flex-1', done ? 'bg-brand-400' : 'bg-neutral-200')} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Classes ──────────────────────────────────────────────────────────

function LevelsStep({
  selectedCodes,
  graduationName,
  onToggleLevel,
  onToggleStage,
  pending,
  onContinue,
  onSkip,
}: {
  selectedCodes: Set<string>;
  graduationName: string | null;
  onToggleLevel: (code: string) => void;
  onToggleStage: (stage: LadderStage, on: boolean) => void;
  pending: boolean;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>Step 1</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
          Which classes does your school run?
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
          We&apos;ve filled in the usual Nigerian classes. Turn off any you don&apos;t run — many
          schools stop at Primary 5 or JSS 3.
        </p>
      </div>

      <div className="space-y-4">
        {LADDER_STAGES.map((stage) => {
          const levels = DEFAULT_CLASS_LADDER.filter((l) => l.stage === stage.id);
          const selectedInStage = levels.filter((l) => selectedCodes.has(l.code)).length;
          const allOn = selectedInStage === levels.length;
          const noneOn = selectedInStage === 0;

          return (
            <div key={stage.id} className="card rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[14px] font-bold text-neutral-900">{stage.label}</p>
                  <p className="text-[12px] text-neutral-400">
                    {noneOn
                      ? 'Not offered'
                      : `${selectedInStage} of ${levels.length} class${levels.length > 1 ? 'es' : ''}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleStage(stage.id, !allOn)}
                  className="text-[12px] font-semibold text-brand-700 hover:underline"
                >
                  {allOn ? 'Turn off all' : 'Turn on all'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {levels.map((level) => {
                  const on = selectedCodes.has(level.code);
                  return (
                    <button
                      key={level.code}
                      type="button"
                      onClick={() => onToggleLevel(level.code)}
                      aria-pressed={on}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition duration-150',
                        on
                          ? 'border-brand-400 bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-200/60'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:border-brand-200 hover:bg-brand-50/40',
                      )}
                    >
                      {on ? (
                        <Check aria-hidden className="size-3.5" />
                      ) : (
                        <span className="size-3.5 rounded-full border border-neutral-300" />
                      )}
                      {level.short}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {graduationName ? (
        <div className="flex items-center gap-2 rounded-xl bg-accent-purple-50 px-4 py-3 text-[13px] text-accent-purple-900 ring-1 ring-accent-purple-200/60">
          <GraduationCap aria-hidden className="size-4 shrink-0" />
          <span>
            <strong>{graduationName}</strong> will be your graduation class. Students there leave at
            year end — everyone else moves up one class.
          </span>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onSkip} className="text-[13px] font-medium text-neutral-400 hover:text-neutral-600">
          Do this later
        </button>
        <button
          type="button"
          disabled={pending || selectedCodes.size === 0}
          onClick={onContinue}
          className={cn(ACADEMIC_UI.btnPrimary, 'justify-center')}
        >
          {pending ? 'Saving…' : 'Save classes & continue'}
          {!pending ? <ArrowRight aria-hidden className="size-4" /> : null}
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Arms? yes/no ───────────────────────────────────────────────────────

function ArmsQuestionStep({
  onBack,
  onNo,
  onYes,
}: {
  onBack: () => void;
  onNo: () => void;
  onYes: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>Step 2</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
          Do your classes have arms?
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
          Arms split a class into streams — like JSS 1 A and JSS 1 B. If every class is just one
          group, you don&apos;t need arms.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onYes}
          className="card group rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-200/60">
            <Layers aria-hidden className="size-5" />
          </span>
          <p className="mt-3 text-[15px] font-bold text-neutral-900">Yes, we have arms</p>
          <p className="mt-1 text-[13px] text-neutral-500">
            Pick the arms (A, B, C…) for each class on the next screen.
          </p>
        </button>

        <button
          type="button"
          onClick={onNo}
          className="card group rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
            <Check aria-hidden className="size-5" />
          </span>
          <p className="mt-3 text-[15px] font-bold text-neutral-900">No arms</p>
          <p className="mt-1 text-[13px] text-neutral-500">
            Each class is a single group. You can add arms anytime later.
          </p>
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-400 hover:text-neutral-600"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back
        </button>
      </div>
    </div>
  );
}

// ── Step 2b: Arms picker ───────────────────────────────────────────────────────

function ArmsPickerStep({
  tenantId,
  academicYearId,
  yearLabel,
  onBack,
  onDone,
}: {
  tenantId: string;
  academicYearId: string | null;
  yearLabel: string | null;
  onBack: () => void;
  onDone: () => void;
}) {
  const levelsQuery = useClassLevels(tenantId);
  const levels = useMemo(
    () => [...(levelsQuery.data?.levels ?? [])].sort((a, b) => a.rank - b.rank),
    [levelsQuery.data],
  );

  const structureQuery = useClassStructure(tenantId, academicYearId ?? '');
  const arms = structureQuery.data?.arms ?? [];

  const setupArms = useSetupClassArms(tenantId);

  const [search, setSearch] = useState('');
  const [openLevelId, setOpenLevelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return levels;
    return levels.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q),
    );
  }, [levels, search]);

  function armsForLevel(levelId: string): string[] {
    return arms
      .filter((a) => a.classLevelId === levelId)
      .map((a) => a.name)
      .sort();
  }

  const openLevel = levels.find((l) => l.id === openLevelId) ?? null;

  async function handleSave(letters: string[]) {
    if (!academicYearId || !openLevel) return;
    setError(null);
    try {
      await setupArms.mutateAsync({
        academicYearId,
        classLevelId: openLevel.id,
        armNames: letters,
      });
      setOpenLevelId(null);
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  if (!academicYearId) {
    return (
      <div className="space-y-5">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Step 2</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
            Set your school year first
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
            Arms belong to a specific school year. Start your school year, then come back to add
            arms.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className={ACADEMIC_UI.btnSecondary}>
            Back
          </button>
          <button type="button" onClick={onDone} className={ACADEMIC_UI.btnPrimary}>
            Skip arms for now
          </button>
        </div>
      </div>
    );
  }

  const configuredCount = levels.filter((l) => armsForLevel(l.id).length > 0).length;

  return (
    <div className="space-y-5">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>Step 2 · {yearLabel ?? 'This year'}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
          Add arms to your classes
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
          Tap a class, pick its arms (A, B, C…), and save. Skip any class that has no arms.
        </p>
      </div>

      {error ? (
        <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{error}</div>
      ) : null}

      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a class…"
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 text-[14px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
        />
      </div>

      <div className={ACADEMIC_UI.dataPanel}>
        <ul className="divide-y divide-neutral-100">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-neutral-500">No classes match.</li>
          ) : (
            filtered.map((level) => {
              const levelArms = armsForLevel(level.id);
              return (
                <li key={level.id}>
                  <button
                    type="button"
                    onClick={() => setOpenLevelId(level.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-brand-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-neutral-900">{level.name}</p>
                      {levelArms.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {levelArms.map((arm) => (
                            <span
                              key={arm}
                              className="rounded-md bg-brand-100/70 px-1.5 py-0.5 text-[11px] font-bold text-brand-800"
                            >
                              {level.name} {arm}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-0.5 text-[12px] text-neutral-400">No arms yet — tap to add</p>
                      )}
                    </div>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-neutral-300" />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-400 hover:text-neutral-600"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back
        </button>
        <button type="button" onClick={onDone} className={cn(ACADEMIC_UI.btnPrimary, 'justify-center')}>
          {configuredCount > 0 ? `Done — ${configuredCount} class set` : 'Done'}
          <Check aria-hidden className="size-4" />
        </button>
      </div>

      {openLevel ? (
        <ArmLetterDialog
          open={Boolean(openLevelId)}
          onOpenChange={(o) => {
            if (!o) setOpenLevelId(null);
          }}
          levelName={openLevel.name}
          existing={armsForLevel(openLevel.id)}
          pending={setupArms.isPending}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}

// ── Step 3: Done ───────────────────────────────────────────────────────────────

function DoneStep({ levelCount, onFinish }: { levelCount: number; onFinish: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-200/60">
        <Sparkles aria-hidden className="size-7" />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">
          Your classes are set
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-neutral-500">
          {levelCount > 0
            ? `${levelCount} class${levelCount > 1 ? 'es' : ''} ready. You can now admit students, build the timetable, and run results.`
            : 'You can now admit students, build the timetable, and run results.'}
        </p>
      </div>
      <div className="flex justify-center">
        <button type="button" onClick={onFinish} className={cn(ACADEMIC_UI.btnPrimary, 'justify-center')}>
          Go to Academic
          <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
