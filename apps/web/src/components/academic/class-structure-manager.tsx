'use client';

import { useMemo, useState } from 'react';
import type { AcademicYearResponse, ClassLevelResponse } from '@loomis/contracts';
import {
  useAcademicYears,
  useClassLevels,
  useClassStructure,
  useCreateClassArm,
  useCreateClassLevel,
  useProgressions,
  useUpsertProgression,
} from '@loomis/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createClassArmRequest,
  createClassLevelRequest,
  type CreateClassArmRequest,
  type CreateClassLevelRequest,
  type UpsertProgressionRequest,
} from '@loomis/contracts';
import { ArrowRight, Layers, Plus } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';

import { AcademicEmptyState, AcademicSectionHeader } from '@/components/academic/academic-empty-state';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { pickActiveYear } from '@/lib/academic/academic-metrics';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { classLevelName } from '@/lib/academic/promotion-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { cn } from '@loomis/ui-web';

interface ClassStructureManagerProps {
  tenantId: string;
}

export function ClassStructureManager({ tenantId }: ClassStructureManagerProps) {
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const defaultYear = useMemo(() => pickActiveYear(years), [years]);
  const [yearId, setYearId] = useState<string | null>(null);
  const activeYearId = yearId ?? defaultYear?.id ?? years[0]?.id ?? null;
  const activeYear = years.find((y) => y.id === activeYearId) ?? null;

  const levelsQuery = useClassLevels(tenantId);
  const levels = levelsQuery.data?.levels ?? [];
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.rank - b.rank),
    [levels],
  );

  const structureQuery = useClassStructure(tenantId, activeYearId ?? '');
  const arms = structureQuery.data?.arms ?? [];

  const progressionsQuery = useProgressions(tenantId);
  const progressions = progressionsQuery.data?.progressions ?? [];

  const [levelOpen, setLevelOpen] = useState(false);
  const [armOpen, setArmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createLevel = useCreateClassLevel(tenantId);
  const createArm = useCreateClassArm(tenantId);
  const upsertProgression = useUpsertProgression(tenantId);

  const levelForm = useForm<CreateClassLevelRequest>({
    resolver: zodResolver(createClassLevelRequest) as Resolver<CreateClassLevelRequest>,
    defaultValues: { code: '', name: '', rank: sortedLevels.length + 1, isTerminal: false },
  });

  const armForm = useForm<CreateClassArmRequest>({
    resolver: zodResolver(createClassArmRequest) as Resolver<CreateClassArmRequest>,
    defaultValues: {
      academicYearId: activeYearId ?? '',
      classLevelId: sortedLevels[0]?.id ?? '',
      name: '',
    },
  });

  const isLoading = yearsQuery.isLoading || levelsQuery.isLoading;

  async function submitLevel(values: CreateClassLevelRequest) {
    setFormError(null);
    try {
      await createLevel.mutateAsync(values);
      levelForm.reset({
        code: '',
        name: '',
        rank: sortedLevels.length + 2,
        isTerminal: false,
      });
      setLevelOpen(false);
    } catch (err) {
      setFormError(academicErrorMessage(err));
    }
  }

  async function submitArm(values: CreateClassArmRequest) {
    setFormError(null);
    try {
      await createArm.mutateAsync({ ...values, academicYearId: activeYearId! });
      armForm.reset({
        academicYearId: activeYearId ?? '',
        classLevelId: sortedLevels[0]?.id ?? '',
        name: '',
      });
      setArmOpen(false);
    } catch (err) {
      setFormError(academicErrorMessage(err));
    }
  }

  async function saveProgression(level: ClassLevelResponse, toLevelId: string | null, isTerminal: boolean) {
    setFormError(null);
    const body: UpsertProgressionRequest = {
      fromClassLevelId: level.id,
      toClassLevelId: isTerminal ? null : toLevelId,
      isTerminal,
    };
    try {
      await upsertProgression.mutateAsync(body);
    } catch (err) {
      setFormError(academicErrorMessage(err));
    }
  }

  return (
    <div className="space-y-8">
      {years.length > 0 && activeYear ? (
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-neutral-500">Structure year</span>
          {years.map((year: AcademicYearResponse) => (
            <button
              key={year.id}
              type="button"
              onClick={() => setYearId(year.id)}
              className={
                year.id === activeYearId ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive
              }
            >
              {year.label}
            </button>
          ))}
        </div>
      ) : null}

      {formError ? (
        <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{formError}</div>
      ) : null}

      {/* Class levels */}
      <section className="space-y-4">
        <AcademicSectionHeader
          label="Class levels"
          title="School-wide levels"
          description="Define JSS/SS ranks and mark terminal levels (e.g. SS3) for graduation."
          action={
            <button type="button" onClick={() => setLevelOpen(true)} className={ACADEMIC_UI.btnPrimarySm}>
              <Plus aria-hidden className="size-3.5" />
              Add level
            </button>
          }
        />

        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : sortedLevels.length === 0 ? (
          <AcademicEmptyState
            icon={Layers}
            title="No class levels yet"
            description="Create levels before adding arms or configuring the progression map."
            action={
              <button type="button" onClick={() => setLevelOpen(true)} className={ACADEMIC_UI.btnPrimary}>
                Add first level
              </button>
            }
          />
        ) : (
          <div className={ACADEMIC_UI.dataPanel}>
            <ul className="divide-y divide-neutral-100">
              {sortedLevels.map((level) => (
                <li
                  key={level.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-neutral-900">{level.name}</p>
                    <p className="text-[12px] text-neutral-500">
                      {level.code} · rank {level.rank}
                      {level.isTerminal ? ' · terminal' : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                      level.isTerminal
                        ? 'bg-accent-purple-50 text-accent-purple-800 ring-1 ring-accent-purple-200/60'
                        : 'bg-neutral-100 text-neutral-600',
                    )}
                  >
                    {level.isTerminal ? 'Graduation level' : 'Standard'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Class arms */}
      <section className="space-y-4">
        <AcademicSectionHeader
          label="Class arms"
          title={`Arms in ${activeYear?.label ?? 'year'}`}
          description="Arms belong to a specific academic year (e.g. JSS1 A, JSS1 B)."
          action={
            <button
              type="button"
              onClick={() => setArmOpen(true)}
              disabled={!activeYearId || sortedLevels.length === 0}
              className={ACADEMIC_UI.btnPrimarySm}
            >
              <Plus aria-hidden className="size-3.5" />
              Add arm
            </button>
          }
        />

        {structureQuery.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : arms.length === 0 ? (
          <AcademicEmptyState
            compact
            icon={Layers}
            title="No arms for this year"
            description="Add class arms once levels exist."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {arms.map((arm) => (
              <div key={arm.id} className="card rounded-xl px-4 py-3">
                <p className="text-[13px] font-bold text-neutral-900">{arm.name}</p>
                <p className="text-[11px] text-neutral-500">
                  {classLevelName(sortedLevels, arm.classLevelId)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Progression map */}
      <section className="space-y-4">
        <AcademicSectionHeader
          label="Progression map"
          title="Year-end destinations"
          description="Defines where each level moves at promotion time. Terminal levels have no destination."
        />

        {progressionsQuery.isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : sortedLevels.length === 0 ? null : (
          <div className={ACADEMIC_UI.dataPanel}>
            <ul className="divide-y divide-neutral-100">
              {sortedLevels.map((level) => {
                const existing = progressions.find((p) => p.fromClassLevelId === level.id);
                const isTerminal = existing?.isTerminal ?? level.isTerminal;

                return (
                  <li key={level.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="min-w-[100px] text-[13px] font-semibold text-neutral-900">
                      {level.name}
                    </span>
                    <ArrowRight aria-hidden className="hidden size-4 text-neutral-300 sm:block" />
                    {isTerminal ? (
                      <span className="text-[12px] font-medium text-accent-purple-700">
                        Graduates (terminal)
                      </span>
                    ) : (
                      <select
                        value={existing?.toClassLevelId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          void saveProgression(level, val, false);
                        }}
                        className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-2 text-[12px] sm:h-9 sm:min-w-[160px] sm:w-auto"
                      >
                        <option value="">Select destination…</option>
                        {sortedLevels
                          .filter((l) => l.id !== level.id)
                          .map((dest) => (
                            <option key={dest.id} value={dest.id}>
                              {dest.name}
                            </option>
                          ))}
                      </select>
                    )}
                    <label className="flex items-center gap-2 text-[12px] text-neutral-600 sm:ml-auto">
                      <input
                        type="checkbox"
                        checked={isTerminal}
                        onChange={(e) => {
                          void saveProgression(level, null, e.target.checked);
                        }}
                        className="size-4 rounded border-neutral-300"
                      />
                      Terminal
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Add level dialog */}
      <Dialog open={levelOpen} onOpenChange={setLevelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add class level</DialogTitle>
            <DialogDescription>Levels are tenant-wide and ordered by rank.</DialogDescription>
          </DialogHeader>
          <Form {...levelForm}>
            <form onSubmit={levelForm.handleSubmit(submitLevel)} className="space-y-4">
              <FormField
                control={levelForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="JSS1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={levelForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Junior Secondary 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={levelForm.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rank</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={levelForm.watch('isTerminal')}
                  onChange={(e) => levelForm.setValue('isTerminal', e.target.checked)}
                />
                Terminal graduation level
              </label>
              <DialogFooter className="gap-2 sm:justify-end">
                <button type="button" onClick={() => setLevelOpen(false)} className={ACADEMIC_UI.btnSecondary}>
                  Cancel
                </button>
                <button type="submit" disabled={createLevel.isPending} className={ACADEMIC_UI.btnPrimary}>
                  {createLevel.isPending ? 'Saving…' : 'Create level'}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add arm dialog */}
      <Dialog open={armOpen} onOpenChange={setArmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add class arm</DialogTitle>
            <DialogDescription>For {activeYear?.label ?? 'selected year'}.</DialogDescription>
          </DialogHeader>
          <Form {...armForm}>
            <form onSubmit={armForm.handleSubmit(submitArm)} className="space-y-4">
              <FormField
                control={armForm.control}
                name="classLevelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class level</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm"
                      >
                        {sortedLevels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={armForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arm name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:justify-end">
                <button type="button" onClick={() => setArmOpen(false)} className={ACADEMIC_UI.btnSecondary}>
                  Cancel
                </button>
                <button type="submit" disabled={createArm.isPending} className={ACADEMIC_UI.btnPrimary}>
                  {createArm.isPending ? 'Saving…' : 'Create arm'}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
