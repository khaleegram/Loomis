'use client';

import { useBellSchedule, useUpsertBellSchedule } from '@loomis/api-client';
import type { BellScheduleSlot } from '@loomis/contracts';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { ArrowLeft, Clock, Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BellScheduleEditor } from '@/components/academic/ops/bell-schedule-editor';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { SURFACES } from '@/lib/design/surfaces';

export default function BellSchedulePage() {
  const tenantId = useTenantId();
  const canManage = useCan('timetable.manage');
  const { yearId, activeYear } = useSchoolAcademic();
  const query = useBellSchedule(tenantId ?? '', yearId);
  const save = useUpsertBellSchedule(tenantId ?? '');

  const [slots, setSlots] = useState<BellScheduleSlot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data?.slots) {
      setSlots(query.data.slots);
      setDirty(false);
    }
  }, [query.data?.slots]);

  if (!tenantId) {
    return (
      <PageBody className="max-w-[900px] px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canManage) {
    return (
      <PageBody className="max-w-[900px] px-4 py-8">
        <Alert>
          <AlertDescription>You do not have permission to edit the bell schedule.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[900px] px-4 py-6 sm:px-6 lg:py-8">
      <Link
        href="/school/timetable"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to timetable
      </Link>

      <section className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div className="px-5 py-6 sm:px-8" style={{ background: SURFACES.hero }}>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Clock aria-hidden className="size-4" />
            </span>
            <div>
              <p className={ACADEMIC_UI.sectionLabel}>School day format</p>
              <h1 className="text-xl font-extrabold text-neutral-900 sm:text-2xl">Bell schedule</h1>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-neutral-500">
            Set when your school starts, how long each period runs, and break times. Every class timetable
            uses this for the selected year.
          </p>

          <div className="mt-4">
            <span className={ACADEMIC_UI.sectionLabel}>Academic year</span>
            <p className="mt-1 text-[13px] font-bold text-neutral-900">
              {activeYear?.label ?? 'No year selected'}
            </p>
            <p className="mt-1 text-[12px] text-neutral-500">
              Change year from the session bar. Every class timetable uses this bell schedule.
            </p>
            {query.data?.isDefault ? (
              <p className="mt-2 text-[12px] font-medium text-amber-700">
                Using Loomis default times — save to customise for your school.
              </p>
            ) : null}
          </div>
        </div>

        <div className="p-5 sm:p-8">
          {query.isLoading ? (
            <p className="text-sm text-neutral-500">Loading bell schedule…</p>
          ) : (
            <BellScheduleEditor
              slots={slots}
              disabled={save.isPending}
              onChange={(next) => {
                setSlots(next);
                setDirty(true);
                setSaved(false);
              }}
            />
          )}

          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {saved ? (
            <Alert className="mt-4 border-emerald-200 bg-emerald-50">
              <AlertDescription className="text-emerald-800">Bell schedule saved.</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className={ACADEMIC_UI.btnPrimary}
              disabled={!dirty || save.isPending || !yearId}
              onClick={async () => {
                if (!yearId) return;
                setError(null);
                try {
                  await save.mutateAsync({ academicYearId: yearId, slots });
                  setDirty(false);
                  setSaved(true);
                } catch (err) {
                  setError(academicErrorMessage(err));
                }
              }}
            >
              <Save aria-hidden className="size-4" />
              {save.isPending ? 'Saving…' : 'Save bell schedule'}
            </button>
          </div>
        </div>
      </section>
    </PageBody>
  );
}
